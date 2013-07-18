var domain = require('domain');
var fs = require('fs-extra');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var pubnubInit = (process.env.LEAPHOME_ENV === 'test' ? require('../../test/support/fake-pubnub.js') : require('pubnub')).init;
var qs = require('querystring');
var url = require('url');
var db = require('./db.js');
var enumerable = require('./enumerable.js');
var async = require('async');

var config = require('../../config/config.js');
var drm = require('./drm.js');
var extract = require('../utils/extract.js');
var oauth = require('./oauth.js');
var semver = require('./semver.js');

var WebLinkApp = require('../models/web-link-app.js');

var PreBundle = enumerable.make([
  'PreBundlingComplete',
  'OriginalManifest'
], 'PreBundle');

var NodePlatformToServerPlatform = {
  'darwin': 'osx',
  'win32': 'windows'
};
var ServerPlatformToNodePlatform = {};
Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
});

var pubnubSubscriptions = {};
var pubnub;
var pubnubDomain = domain.create();

pubnubDomain.on('error', function(err) {
  unsubscribeAllPubnubChannels()
  reconnectAfterError(err);
});

pubnubDomain.run(function() {
  pubnub = pubnubInit({
    subscribe_key: config.PubnubSubscribeKey,
    ssl: true,
    jsonp: true // force http transport to work better with http proxies
  });
});

function unsubscribeAllPubnubChannels() {
  Object.keys(pubnubSubscriptions).forEach(function(channel) {
    console.log('Unsubscribing from PubNub channel: ' + channel);
    pubnubDomain.run(function() {
      pubnub.unsubscribe({ channel: channel });
    });
  });
  pubnubSubscriptions = {};
}

// only allow one callback per channel
function subscribeToPubnubChannel(channel, callback) {
  if (!pubnubSubscriptions[channel]) {
    pubnubSubscriptions[channel] = true;

    pubnubDomain.run(function() {
      pubnub.subscribe({
        channel: channel,
        callback: function(data) {
          try {
            callback(JSON.parse(data));
          } catch (e) {
            console.error('failed to parse pubsub response for', channel, data, e);
          }
        }
      });
    });
  }
}

function getJson(url, cb) {
  var protocolModule = (/^https:/.test(url) ? https : http);
  var responseParts = [];
  return protocolModule.get(url, function(resp) {
    resp.on('data', function(chunk) {
      responseParts.push(chunk);
    });
    resp.on('end', function() {
      try {
        var response = responseParts.join('');
        cb && cb(null, JSON.parse(response));
      } catch(err) {
        cb && cb(err);
      } finally {
        cb = null;
      }
    });

    resp.on('error', function(err) {
      cb && cb(err);
      cb = null;
    });
  });
}

function cleanUpAppJson(appJson) {
  appJson = appJson || {};
  var releaseDate = appJson.certified_at || appJson.created_at;
  var cleanAppJson = {
    id: appJson.app_id,
    appId: appJson.app_id,
    versionId: appJson.id,
    name: appJson.name,
    platform: ServerPlatformToNodePlatform[appJson.platform] || appJson.platform,
    iconUrl: appJson.icon_url,
    tileUrl: appJson.tile_url,
    binaryUrl: appJson.binary_url,
    version: appJson.version_number,
    changelog: appJson.changelog,
    description: appJson.description,
    releaseDate: releaseDate ? new Date(releaseDate).toLocaleDateString() : null
  };
  Object.keys(cleanAppJson).forEach(function(key) {
    if (!cleanAppJson[key]) {
      delete cleanAppJson[key];
    }
  });
  return cleanAppJson;
}

function createAppModel(appJson) {
  var cleanAppJson = cleanUpAppJson(appJson);
  if (cleanAppJson.platform === os.platform()) {
    var StoreLeapApp = require('../models/store-leap-app.js');
    return new StoreLeapApp(cleanAppJson);
  } else {
    return null;
  }
}

function handleAppJson(appJson) {
  var app = createAppModel(appJson);
  if (app) {
    var myApps = uiGlobals.myApps;
    var existingApp = myApps.get(app.get('appId'));
    if (existingApp) {
      if (!existingApp.isInstalled()) {
        var appJson = app.toJSON();
        delete appJson.state;
        existingApp.set(appJson);
      } else if (semver.isFirstGreaterThanSecond(app.get('version'), existingApp.get('version'))) {
        console.log('Upgrade available for ' + app.get('name') + '. New version: ' + app.get('version'));
        existingApp.set('availableUpgrade', app);
      } else {
        existingApp.set('binaryUrl', app.get('binaryUrl'));
      }
    } else {
      try {
        app.set('firstSeenAt', (new Date()).getTime());
        myApps.add(app);
      } catch (err) {
        console.error('Corrupt app data from api: ' + appJson + '\n' + (err.stack || err));
      }
    }
  }
  return app;
}

function subscribeToUserChannel(userId) {
  subscribeToPubnubChannel(userId + '.user.purchased', function() {
    var win = nwGui.Window.get();
    // steal focus
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);

    handleAppJson.apply(this, arguments);
  });
}

function subscribeToAppChannel(appId) {
  subscribeToPubnubChannel(appId + '.app.updated', handleAppJson);
}

function getAuthURL(url, cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err, null) {
      cb && cb(err);
    } else {
      cb && cb(null, config.oauth.redirect_uri + '?' + qs.stringify({ access_token: accessToken, _r: url }));
    }
  });
}

var reconnectionTimeoutId;
function reconnectAfterError(err) {
  console.log('Failed to connect to store server (retrying in ' +  config.ServerConnectRetryMs + 'ms):', err && err.stack ? err.stack : err);
  if (!reconnectionTimeoutId) {
    reconnectionTimeoutId = setTimeout(function() {
      connectToStoreServer();
    }, config.ServerConnectRetryMs);
  }
}

function connectToStoreServer(cb) {
  reconnectionTimeoutId = null;

  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      reconnectAfterError(err);
      cb && cb(err);
      cb = null;
    } else {
      var platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
      var apiEndpoint = config.AppListingEndpoint + '?' + qs.stringify({ access_token: accessToken, platform: platform });
      var req = getJson(apiEndpoint, function(err, messages) {
        if (err) {
          reconnectAfterError(err);
          cb && cb(err);
          cb = null;
        } else if (messages.errors) {
          cb && cb(new Error(messages.errors));
          cb = null;
        } else {
          console.log('Connected to store server.');
          $('body').removeClass('loading');
          messages.forEach(function(message) {
            if (message.auth_id && message.secret_token) {
              drm.writeXml(message.auth_id, message.secret_token);
            }

            if (message.user_id) {
              uiGlobals.username = message.username;
              uiGlobals.email = message.email;
              subscribeToUserChannel(message.user_id);
              uiGlobals.trigger(uiGlobals.Event.SignIn);
            } else {
              var app = handleAppJson(message);
              if (app) {
                subscribeToAppChannel(app.get('appId'));
              }
            }
          });
          cb && cb(null);
          cb = null;
        }
      });

      req.on('error', function(err) {
        reconnectAfterError(err);
        cb && cb(err);
        cb = null;
      });
    }
  });
}

function refreshAppDetails(app, cb) {
  var appId = app.get('appId');
  var platform = NodePlatformToServerPlatform[os.platform()];
  if (appId && platform) {
    oauth.getAccessToken(function(err, accessToken) {
      if (err) {
        return cb && cb(err);
      }
      var url = config.AppDetailsEndpoint;
      url = url.replace(':id', appId);
      url = url.replace(':platform', platform);
      url += '?access_token=' + accessToken;
      console.log('Refreshing app via url: ' + url);
      getJson(url, function(err, appDetails) {
        if (err) {
          return cb && cb(err);
        }
        app.set(cleanUpAppJson(appDetails && appDetails.app_version));
        app.set('gotDetails', true);
        app.save();
        cb && cb(null);
      });
    });
  } else {
    cb && cb(new Error('appId and platform must be valid'));
  }
}

function createWebLinkApps(webAppData) {
  webAppData = webAppData || [];
  var existingWebAppsById = {};
  uiGlobals.myApps.forEach(function(app) {
    if (app.isWebLinkApp()) {
      existingWebAppsById[app.get('id')] = app;
    }
  });
  webAppData.forEach(function(webAppDatum) {
    var webApp = new WebLinkApp(webAppDatum);
    var id = webApp.get('id');
    var existingWebApp = existingWebAppsById[id];
    if (existingWebApp) {
      existingWebApp.set(webAppDatum);
      console.log('Updating existing web link: ' + existingWebApp.get('name'));
      delete existingWebAppsById[id];
      existingWebApp.save();
    } else {
      try {
        uiGlobals.myApps.add(webApp);
      } catch (err) {
        console.error('Corrupt webApp: ' + webApp + '\n' + (err.stack || err));
      }
      console.log('Added web link: ', webApp.get('urlToLaunch'));
      webApp.save();
    }
  });

  Object.keys(existingWebAppsById).forEach(function(id) {
    var oldWebApp = existingWebAppsById[id];
    if (oldWebApp.isBuiltinTile()) {
      console.log('Deleting old builtin web link: ' + oldWebApp.get('name'));
      uiGlobals.myApps.remove(oldWebApp);
      oldWebApp.save();
    }
  });
}

function getLocalAppManifest(cb) {
  var req = getJson(config.NonStoreAppManifestUrl, function(err, manifest) {
    if (err) {
      console.error('Failed to get app manifest: ' + err && err.stack);
      cb && cb(err);
    } else {
      createWebLinkApps(manifest.web);

      var platformApps = manifest[NodePlatformToServerPlatform[os.platform()]] || [];
      cb && cb(null, platformApps);
    }
    cb = null;
  });

  req.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
}

function getFrozenApps(cb) {
  if (db.getItem(PreBundle.PreBundlingComplete)) {
    console.log('PreBundling Complete');
    return;
  }

  var freezeDriedBundlePath = _(config.FrozenAppPaths).find(function(bundlePath) {
    try {
      console.log('Looking for prebundled path in: ' + bundlePath);
      return fs.existsSync(bundlePath);
    } catch (err) {
      console.log('Prebundle path does not exist: ' + bundlePath);
      return false;
    }
  });
  if (freezeDriedBundlePath) {
    console.log('\n\n\nFound freeze-dried preBundle: ' + freezeDriedBundlePath);
    _expandFreezeDriedApps(freezeDriedBundlePath, function(err, manifest) {
      if (err) {
        console.error('Failed to expand prebundle. ' + (err.stack || err));
      } else if (manifest) {
        try {
          _parsePrebundledManifest(manifest);
        } catch (installErr) {
          console.error('Failed to initialize prebundled apps. ' + (installErr.stack || installErr));
        }
      } else {
        console.error('Found prebundle but manifest is missing.');
      }
    });
  } else {
    console.log('No prebundle on this system.');
  }
}

function _expandFreezeDriedApps(bundlePath, cb) {
  var dest = path.join(config.PlatformTempDirs[os.platform()], 'frozen');
  var manifest;

  extract.unzipfile(bundlePath, dest, function(err) {
    if (err) {
      console.error('Failed to unzip ' + bundlePath + ': ' + (err.stack || err));
    } else {
      console.info('Unzipped prebundled apps at ' + bundlePath + ' to ' + dest);
      try {
        console.log('Looking for prebundle manifest at ' + path.join(dest, 'myapps.json'));
        manifest = JSON.parse(fs.readFileSync(path.join(dest, 'myapps.json'), { encoding: 'utf8' }));
        if (manifest) {
          console.log('Caching prebundled manifest ' + JSON.stringify(manifest));
          // May need this to fix a bug (server does not know of entitlement for prebundled app. Lets you upgrade but does not let you run it.)
          //    db.setItem(PreBundle.OriginalManifest, manifest);
          cb && cb(null, manifest);
        }
      } catch (err) {
        console.error('Corrupt myapps.json prebundled manifest: ' + (err.stack || err));
        cb && cb(err);
      }
    }
  });
}

function _parsePrebundledManifest(manifest) {
  console.log('\n\n\nExamining prebundle manifest \n' + JSON.stringify(manifest || {}, null, 3));

  manifest.forEach(function (appJson) {
    var app = handleAppJson(appJson);
    if (app && !uiGlobals.myApps.get(app.get('appId'))) {
      console.log('Installing prebundled app: ' + app.get('name'));
      app.install(function (err) {
        if (err) {
          console.error('Unable to initialize prebundled app ' + JSON.stringify(appJson) + ': ' + (err.stack || err));
        }
      });
      subscribeToAppChannel(app.get('appId'));
    }
  });

  db.setItem(PreBundle.PreBundlingComplete, true);
}


var LeapDataDir = 'Leap Motion';
var appDataFile = 'lastauth';
var PlatformUserDataDirs = {
  win32:  [ process.env.APPDATA, LeapDataDir, appDataFile ],
  darwin: [ process.env.HOME, 'Library', 'Application Support', LeapDataDir, appDataFile ],
  linux:  [ process.env.HOME, appDataFile ]
};

function sendDeviceData() {
  var dirs = PlatformUserDataDirs[os.platform()];
  if (!dirs) {
    throw new Error('Unknown operating system: ' + os.platform());
  }
  
  var baseDir = path.join.apply(path, dirs);
  if (!fs.existsSync(baseDir)) {
    console.error('App data not found: ' + baseDir);
    return;
  }

  var authdata = fs.readFileSync(baseDir).toString();
  if (!authdata) {
    console.error('Missing auth data' + authdata);
    return;
  }

  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      console.error('Failed to get an access token: ' + err && err.stack);
    } else {
      var devicedataurl = config.DeviceDataEndpoint;

      var urlParts = url.parse(devicedataurl);
      var options = {
        hostname: urlParts.hostname,
        path: urlParts.pathname,
        port: urlParts.port,
        auth: urlParts.auth,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      var responseParts = [];
      var protocolModule = (/^https:/.test(devicedataurl) ? https : http);
      var req = protocolModule.request(options, function(resp) {
        resp.on('data', function(chunk) {
          responseParts.push(chunk);
        });
        resp.on('end', function() {
          try {
            var response = responseParts.join('');
            console.log('Sent device data. ' + devicedataurl + ", " + qs.stringify({ access_token: accessToken, data: authdata }));
          } catch(err) {
            console.error('Failed to send device data: ' + err && err.stack);
          }
        });

        resp.on('error', function(err) {
          console.error('Failed to send device data: ' + err && err.stack);
        });
      });

      req.end(qs.stringify({ access_token: accessToken, data: authdata }));
    }
  });
}

module.exports.unsubscribeAllPubnubChannels = unsubscribeAllPubnubChannels;
module.exports.connectToStoreServer = connectToStoreServer;
module.exports.getLocalAppManifest = getLocalAppManifest;
module.exports.refreshAppDetails = refreshAppDetails;
module.exports.getFrozenApps = getFrozenApps;
module.exports.sendDeviceData = sendDeviceData;
module.exports.getAuthURL = getAuthURL;

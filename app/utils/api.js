var domain = require('domain');
var fs = require('fs-extra');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var pubnubInit = (process.env.LEAPHOME_ENV === 'test' ? require('../../test/support/fake-pubnub.js') : require('pubnub')).init;
var qs = require('querystring');

var config = require('../../config/config.js');
var drm = require('./drm.js');
var extract = require('../utils/extract.js');
var oauth = require('./oauth.js');
var semver = require('./semver.js');

var WebLinkApp = require('../models/web-link-app.js');

var NodePlatformToServerPlatform = {
  'darwin': 'osx',
  'win32': 'windows'
};
var ServerPlatformToNodePlatform = {};
Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
});

var subscribe = (function() {
  var subscribed = {};
  var pubnub;
  var pubnubDomain = domain.create();
  pubnubDomain.on('error', function(err) {
    Object.keys(subscribed).forEach(function(channel) {
      try {
        pubnub.unsubscribe({ channel: channel });
      } catch (e) {
        console.warn('Could not unsubscribe from channel: ' + channel);
      }
    });
    subscribed = {};
    reconnectAfterError(err);
  });

  pubnubDomain.run(function() {
    pubnub = pubnubInit({
      subscribe_key: config.PubnubSubscribeKey,
      ssl: true,
      jsonp: true // force http transport to work better with http proxies
    });
  });

  // Don't subscribe to the same channel more than once
  return function(channel, callback) {
    if (subscribed[channel] !== callback) {
      subscribed[channel] = callback;

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
  };
})();

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
    releaseDate: releaseDate ? new Date(releaseDate).toLocaleDateString() : null,
    firstSeenAt: (new Date()).getTime()
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
      myApps.add(app);
    }
  }
  return app;
}

function subscribeToUserChannel(userId) {
  subscribe(userId + '.user.purchased', function() {
    var win = nwGui.Window.get();
    // steal focus
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);

    handleAppJson.apply(this, arguments);
  });
}

function subscribeToAppChannel(appId) {
  subscribe(appId + '.app.updated', handleAppJson);
}

function getAuthURL(url, cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err, null) {
      cb(err);
    } else {
      cb(null, config.oauth.redirect_uri + '?' + qs.stringify({ access_token: accessToken, _r: url }));
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
      uiGlobals.myApps.add(webApp);
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
  config.FrozenAppPaths.forEach(function(path) {
    console.log('looking for path', path)
    if (fs.existsSync(path)) {
      console.log('found app', path)
      extract.unzipfile(path, './tmp/', function(err) {
        if (err) return;
        console.log('done extracting', err)
        var manifest = JSON.parse(fs.readFileSync('./tmp/myapps.json', {encoding: 'utf8'}));
        console.log('manifest', manifest)
        manifest.forEach(function(message) {
          var app = handleAppJson(message, true);
          console.log('manifest item', app)
          if (app) {
            app.install(function (err) {
              if (err) console.log('failed to install app', err)
            }, true);
            subscribeToAppChannel(app.get('appId'));
          }
        });
      })
    }
  })
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
      var url = config.DeviceDataEndpoint + '?' + qs.stringify({ access_token: accessToken, data: authdata });
      getJson(url, function(err, manifest) {
        if (err) {
          console.error('Failed to send device data: ' + err && err.stack);
        } else {
          console.log('Sent device data. ');
        }
      })
    }
  });
}

module.exports.connectToStoreServer = connectToStoreServer;
module.exports.getLocalAppManifest = getLocalAppManifest;
module.exports.refreshAppDetails = refreshAppDetails;
module.exports.getFrozenApps = getFrozenApps;
module.exports.sendDeviceData = sendDeviceData;
module.exports.getAuthURL = getAuthURL;

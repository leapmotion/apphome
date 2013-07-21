var domain = require('domain');
var fs = require('fs-extra');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var qs = require('querystring');
var url = require('url');
var db = require('./db.js');
var enumerable = require('./enumerable.js');
var async = require('async');

var config = require('../../config/config.js');
var httpHelper = require('./http-helper.js');
var drm = require('./drm.js');
var oauth = require('./oauth.js');
var pubnub = require('./pubnub.js');
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
        getAppDetails(app, function() {
          var appJson = app.toJSON();
          delete appJson.state;
          existingApp.set(appJson);
        });
      } else if (app.get('versionId') > existingApp.get('versionId')) {
        console.log('Upgrade available for ' + app.get('name') + '. New version: ' + app.get('version'));
        existingApp.set('availableUpgrade', app);
        getAppDetails(app);
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
  pubnub.subscribe(userId + '.user.purchased', function() {
    var win = nwGui.Window.get();
    // steal focus
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);

    handleAppJson.apply(this, arguments);
  });
}

function subscribeToAppChannel(appId) {
  pubnub.subscribe(appId + '.app.updated', handleAppJson);
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

function connectToStoreServer() {
  reconnectionTimeoutId = null;

  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      reconnectAfterError(err);
    } else {
      var platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
      var apiEndpoint = config.AppListingEndpoint + '?' + qs.stringify({ access_token: accessToken, platform: platform });
      httpHelper.getJson(apiEndpoint, function(err, messages) {
        if (err) {
          reconnectAfterError(err);
        } else if (messages.errors) {
          reconnectAfterError(new Error(messages.errors));
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
        }
      });
    }
  });
}

var appDetailsQueue = [];
function getAppDetailsForNextInQueue() {
  var queuedData = appDetailsQueue.shift();
  if (queuedData) {
    getAppDetails(queuedData.app, queuedData.cb);
  }
}

function getAppDetails(app, cb) {
  if (appDetailsQueue.length > 0) {
    appDetailsQueue.push({
      app: app,
      cb: cb
    });
  } else {
    var appId = app.get('appId');
    var platform = NodePlatformToServerPlatform[os.platform()];
    if (appId && platform) {
      oauth.getAccessToken(function(err, accessToken) {
        if (err) {
          cb && cb(err);
          return getAppDetailsForNextInQueue();
        }
        var url = config.AppDetailsEndpoint;
        url = url.replace(':id', appId);
        url = url.replace(':platform', platform);
        url += '?access_token=' + accessToken;
        console.log('Getting app details via url: ' + url);
        httpHelper.getJson(url, function(err, appDetails) {
          if (err) {
            cb && cb(err);
          } else {
            app.set(cleanUpAppJson(appDetails && appDetails.app_version));
            app.set('gotDetails', true);
            app.save();
            cb && cb(null);
          }
          cb = null;
          getAppDetailsForNextInQueue();
        });
      });
    } else {
      cb && cb(new Error('appId and platform must be valid'));
      getAppDetailsForNextInQueue();
    }
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
  httpHelper.getJson(config.NonStoreAppManifestUrl, function(err, manifest) {
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
}


var AppDataFile = 'lastauth';
function sendDeviceData() {
  var dataDir = config.PlatformLeapDataDirs[os.platform()];
  if (!dataDir) {
    console.error('Leap Motion data dir unknown for operating system: ' + os.platform());
    return;
  }
  
  var authDataFile = path.join(dataDir, AppDataFile);
  if (!fs.existsSync(AppDataFile)) {
    console.warn('Auth data not found: ' + AppDataFile);
    return;
  }

  var authData = fs.readFileSync(authDataFile, 'utf-8');
  if (!authData) {
    console.warn('Auth data file is empty.');
    return;
  }

  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      console.warn('Failed to get an access token: ' + (err.stack || err));
    } else {
      httpHelper.post(config.DeviceDataEndpoint, { access_token: accessToken, data: authData }, function(err) {
        if (err) {
          console.warn('Failed to send device data: ' + (err.stack || err));
        } else {
          console.log('Sent device data: ' + authData);
        }
      });
    }
  });
}

function parsePrebundledManifest(manifest) {
  console.log('\n\n\nExamining prebundle manifest \n' + JSON.stringify(manifest || {}, null, 2));

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
}

module.exports.connectToStoreServer = connectToStoreServer;
module.exports.getLocalAppManifest = getLocalAppManifest;
module.exports.getAppDetails = getAppDetails;
module.exports.sendDeviceData = sendDeviceData;
module.exports.parsePrebundledManifest = parsePrebundledManifest;

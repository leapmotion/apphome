var http = require('http');
var https = require('https');
var os = require('os');

var config = require('../../config/config.js');
var oauth = require('./oauth.js');

var StoreLeapApp = require('../models/store-leap-app.js');

// TODO: real data
var FakeLocalAppData = require('../../config/local-apps.js');

var NodePlatformToServerPlatform = {
  'darwin': 'osx',
  'win32': 'windows'
};
var ServerPlatformToNodePlatform = {};
Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
});

var pubnub = require('pubnub').init({
  subscribe_key: config.PubnubSubscribeKey,
  ssl: true
});

function createAppModel(appJson) {
  var cleanAppJson = {
    id: appJson.id,
    appId: appJson.app_id,
    name: appJson.name,
    platform: ServerPlatformToNodePlatform[appJson.platform] || appJson.platform,
    iconUrl: appJson.icon_url,
    tileUrl: appJson.tile_url,
    binaryUrl: appJson.binary_url,
    version: appJson.version_number,
    changelog: appJson.changelog,
    releaseDate: new Date(appJson.certified_at || appJson.created_at).toLocaleDateString()
  };
  if (cleanAppJson.platform === os.platform()) {
    return new StoreLeapApp(cleanAppJson);
  } else {
    return null;
  }
}

function handleAppJson(appJson, noAutoInstall) {
  var app = createAppModel(appJson);
  if (app) {
    if (uiGlobals.installedApps.get(app.get('id')) ||
        uiGlobals.uninstalledApps.get(app.get('id'))) {
      // app already exists, so ignore it
      return;
    } else if (noAutoInstall || app.isUpgrade()) {
      var existingUpgrade = uiGlobals.availableDownloads.findWhere({ appId: app.get('appId') });
      if (existingUpgrade && semver.isFirstGreaterThanSecond(app.get('version'), existingUpgrade.get('version'))) {
        // replace the older upgrade if a new one comes in
        uiGlobals.availableDownloads.remove(existingUpgrade);
        uiGlobals.availableDownloads.add(app);
      } else if (!existingUpgrade) {
        // add a new download
        uiGlobals.availableDownloads.add(app);
      }
    } else {
      console.log('installing app: ' + app.get('name'));
      uiGlobals.installedApps.add(app);
      app.install(function(err) {
        err && console.log('Failed to install app', app.get('name'), err.message);
      });
    }
  }
  return app;
}

function subscribeToUserChannel(userId) {
  pubnub.subscribe({
    channel: userId + '.user.purchased',
    callback: handleAppJson
  });
}

function subscribeToAppChannel(appId) {
  pubnub.subscribe({
    channel: appId + '.app.updated',
    callback: handleAppJson
  });
}

function connectToStoreServer(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      cb && cb(err);
    } else {
      var responseParts = [];
      var protocolModule = (/^https:/.test(config.AppListingEndpoint) ? https : http);
      var platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
      var apiEndpoint = config.AppListingEndpoint + accessToken + '&platform=' + platform;
      var req = protocolModule.get(apiEndpoint, function(resp) {
        resp.on('data', function(chunk) {
          responseParts.push(chunk);
        });
        resp.on('end', function() {
          try {
            var parsedServerResponse = JSON.parse(responseParts.join(''));
            parsedServerResponse.forEach(function(message) {
              if (message.user_id) {
                subscribeToUserChannel(message.user_id);
              } else {
                var app = handleAppJson(message, true);
                if (app) {
                  subscribeToAppChannel(app.get('appId'));
                }
              }
            });
            cb && cb(null);
            cb = null;
          } catch(err) {
            cb && cb(err);
            cb = null;
          }
        });
        resp.on('error', function(err){
          cb && cb(err);
          cb = null;
        });
      });

      req.on('error', function(err) {
        cb && cb(err);
        cb = null;
      });
    }
  });
}

function localApps() {
  return FakeLocalAppData[os.platform()] || [];
}

module.exports.connectToStoreServer = connectToStoreServer;
module.exports.localApps = localApps;

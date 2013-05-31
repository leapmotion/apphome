var domain = require('domain');
var http = require('http');
var https = require('https');
var os = require('os');
var qs = require('querystring');

var config = require('../../config/config.js');
var oauth = require('./oauth.js');
var semver = require('./semver.js');

var StoreLeapApp = require('../models/store-leap-app.js');

var NodePlatformToServerPlatform = {
  'darwin': 'osx',
  'win32': 'windows'
};
var ServerPlatformToNodePlatform = {};
Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
});

var subscribe = (function() {
  var pubnub = require('pubnub').init({
    subscribe_key: config.PubnubSubscribeKey,
    ssl: true
  });
  var subscribed = {};
  var pubnubDomain = domain.create();
  pubnubDomain.on('error', function() {
    Object.keys(subscribed).forEach(function(channel) {
      try {
        pubnub.unsubscribe({ channel: channel });
      } catch (e) {
        console.warn('Could not unsubscribe from channel: ' + channel);
      }
    });
    subscribed = {};
    connectToStoreServer();
  });
  // Don't subscribe to the same channel more than once
  return function(channel, callback) {
    if (subscribed[channel] === callback) return;
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
    var availableDownloads = uiGlobals.availableDownloads;
    var installedApps = uiGlobals.installedApps;
    var uninstalledApps = uiGlobals.uninstalledApps;
    var existingApp = availableDownloads.get(app.get('id')) || installedApps.get(app.get('id')) || uninstalledApps.get(app.get('id'));
    var upgradableUninstalledApp = uninstalledApps.findWhere({ appId: app.get('appId') });
    if (existingApp) {
      existingApp.set('binaryUrl', app.get('binaryUrl'));
    } else if (upgradableUninstalledApp && semver.isFirstGreaterThanSecond(app.get('version'), upgradableUninstalledApp.get('version'))) {
      // upgrade to an uninstalled app
      uninstalledApps.remove(upgradableUninstalledApp);
      uninstalledApps.add(app);
    } else if (noAutoInstall || app.isUpgrade()) {
      var existingUpgrade = availableDownloads.findWhere({ appId: app.get('appId') });
      if (existingUpgrade && semver.isFirstGreaterThanSecond(app.get('version'), existingUpgrade.get('version'))) {
        // replace the older upgrade if a new one comes in
        availableDownloads.remove(existingUpgrade);
        availableDownloads.add(app);
      } else if (!existingUpgrade) {
        // add a new download
        availableDownloads.add(app);
      }
    } else {
      // new app to install
      console.log('installing app: ' + app.get('name'));
      installedApps.add(app);
      app.install(function(err) {
        err && console.log('Failed to install app', app.get('name'), err.message);
      });
    }
  }
  return app;
}

function subscribeToUserChannel(userId) {
  subscribe(userId + '.user.purchased', handleAppJson);
}

function subscribeToAppChannel(appId) {
  subscribe(appId + '.app.updated', handleAppJson);
}

function reconnectAfterError(err) {
  console.log('Failed to connect to store server (retrying in ' +  config.ServerConnectRetryMs + 'ms):', err.stack ? err.stack : err);
  setTimeout(connectToStoreServer, config.ServerConnectRetryMs);
}

function connectToStoreServer(cb) {
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
        } else {
          console.log('Connected to store server.');
          messages.forEach(function(message) {
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

function getLocalAppManifest(cb) {
  var req = getJson(config.LocalAppManifestUrl, function(err, manifest) {
    if (err) {
      cb && cb(err);
    } else {
      cb && cb(null, manifest[NodePlatformToServerPlatform[os.platform()]] || []);
    }
    cb = null;
  });

  req.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
}

module.exports.connectToStoreServer = connectToStoreServer;
module.exports.getLocalAppManifest = getLocalAppManifest;

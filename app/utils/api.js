var domain = require('domain');
var http = require('http');
var https = require('https');
var os = require('os');
var pubnub = (process.env.LEAPHOME_ENV === 'test' ? require('../../test/support/fake-pubnub.js') : require('pubnub'));
var qs = require('querystring');

var config = require('../../config/config.js');
var drm = require('./drm.js');
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
    pubnub.init({
      subscribe_key: config.PubnubSubscribeKey,
      ssl: true
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
    var StoreLeapApp = require('../models/store-leap-app.js');
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
      var existingDownload = availableDownloads.findWhere({ appId: app.get('appId') });
      if (existingDownload && semver.isFirstGreaterThanSecond(app.get('version'), existingDownload.get('version'))) {
        // replace the older upgrade if a new one comes in
        availableDownloads.remove(existingDownload);
        availableDownloads.add(app);
      } else if (!existingDownload) {
        // add a new download
        availableDownloads.add(app);
      }
    } else {
      // new app to install
      console.log('Installing app: ' + app.get('name'));
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
module.exports.hasEverConnected; // exposed for tests
function reconnectAfterError(err) {
  console.log('Failed to connect to store server (retrying in ' +  config.ServerConnectRetryMs + 'ms):', err && err.stack ? err.stack : err);
  if (!reconnectionTimeoutId) {
    reconnectionTimeoutId = setTimeout(function() {
      connectToStoreServer(!module.exports.hasEverConnected);
    }, config.ServerConnectRetryMs);
  }
}

function connectToStoreServer(noAutoInstall, cb) {
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
          module.exports.hasEverConnected = true;
          console.log('Connected to store server.');
          messages.forEach(function(message) {
            if (message.auth_id && message.secret_token) {
              drm.writeXml(message.auth_id, message.secret_token);
            }

            if (message.user_id) {
              subscribeToUserChannel(message.user_id);
            } else {
              var app = handleAppJson(message, noAutoInstall);
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

function createWebLinkApps(webAppData) {
  webAppData = webAppData || [];
  var existingWebAppsById = {};
  var allApps = uiGlobals.installedApps.models.concat(uiGlobals.uninstalledApps.models);
  allApps.forEach(function(app) {
    if (app.isWebLinkApp()) {
      existingWebAppsById[app.get('id')] = app;
    }
  });
  webAppData.forEach(function(webAppDatum) {
    var webApp = new WebLinkApp(webAppDatum);
    var id = webApp.get('id');
    var existingWebApp = existingWebAppsById[id];
    if (existingWebApp) {
      if (existingWebApp.get('iconUrl') !== webApp.get('iconUrl')) {
        existingWebApp.set('iconUrl', webApp.get('iconUrl'));
        existingWebApp.downloadIcon();
        console.info('icon updated for ' + existingWebApp.get('name'));
      }
      if (existingWebApp.get('tileUrl') !== webApp.get('tileUrl')) {
        existingWebApp.set('tileUrl', webApp.get('tileUrl'));
        existingWebApp.downloadTile();
        console.info('tile updated for ' + existingWebApp.get('name'));
      }
      existingWebApp.set(webAppDatum);
      console.log('Updating existing web link: ' + existingWebApp.get('name'));
      delete existingWebAppsById[id];
      existingWebApp.save();
    } else {
      uiGlobals.installedApps.add(webApp);
      console.log('Added web link: ', webApp.get('urlToLaunch'));
      webApp.save();
    }
  });

  Object.keys(existingWebAppsById).forEach(function(id) {
    var oldWebApp = existingWebAppsById[id];
    if (oldWebApp.isBuiltinTile()) {
      console.log('Deleting old builtin web link: ' + oldWebApp.get('name'));
      uiGlobals.installedApps.remove(oldWebApp);
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

module.exports.connectToStoreServer = connectToStoreServer;
module.exports.getLocalAppManifest = getLocalAppManifest;
module.exports.getAuthURL = getAuthURL;

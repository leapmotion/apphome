// Generated by CoffeeScript 1.6.3
(function() {
  var LeapApp, NodePlatformToServerPlatform, Q, ServerPlatformToNodePlatform, appsAdded, async, cleanAppJson, config, connectToStoreServer, db, domain, drm, enumerable, fs, getAppJson, getNonStoreManifest, getUserInformation, handleAppJson, httpHelper, installManager, oauth, os, parsePrebundledManifest, path, pubnub, qs, reconnectAfterError, reconnectionPromise, sendAppVersionData, sendDeviceData, subscribeToAppChannel, subscribeToUserChannel, syncToCollection, url, _getStoreManifest, _setGlobalUserInformation;

  async = require("async");

  domain = require("domain");

  fs = require("fs-extra");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  url = require("url");

  Q = require("q");

  config = require("../../config/config.js");

  db = require("./db.js");

  drm = require("./drm.js");

  enumerable = require("./enumerable.js");

  httpHelper = require("./http-helper.js");

  installManager = require("./install-manager.js");

  oauth = require("./oauth.js");

  pubnub = require("./pubnub.js");

  LeapApp = require("../models/leap-app.js");

  NodePlatformToServerPlatform = {
    darwin: "osx",
    win32: "windows"
  };

  ServerPlatformToNodePlatform = {};

  Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
    return ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
  });

  appsAdded = 0;

  cleanAppJson = function(appJson) {
    var cleanedAppJson, releaseDate;
    appJson = appJson || {};
    releaseDate = appJson.certified_at || appJson.created_at;
    cleanedAppJson = {
      id: appJson.app_id,
      appId: appJson.app_id,
      versionId: appJson.id,
      appType: appJson.appType,
      name: appJson.name,
      platform: ServerPlatformToNodePlatform[appJson.platform] || appJson.platform,
      iconUrl: appJson.icon_url,
      tileUrl: appJson.tile_url,
      binaryUrl: appJson.binary_url,
      version: appJson.version_number,
      changelog: appJson.changelog,
      description: appJson.description,
      tagline: appJson.tagline,
      releaseDate: (releaseDate ? new Date(releaseDate).toLocaleDateString() : null),
      noAutoInstall: appJson.noAutoInstall,
      cleaned: true
    };
    Object.keys(cleanedAppJson).forEach(function(key) {
      if (!cleanedAppJson[key]) {
        return delete cleanedAppJson[key];
      }
    });
    return cleanedAppJson;
  };

  handleAppJson = function(appJson, silent) {
    var app, err, existingApp, myApps, uninstalledApps;
    if (silent == null) {
      silent = false;
    }
    if (!appJson.cleaned) {
      appJson = cleanAppJson(appJson);
    }
    if (!((appJson.urlToLaunch != null) || (appJson.findByScanning != null) || ((appJson.platform != null) && appJson.platform === os.platform()))) {
      console.log("Skipping invalid app for this platform:", appJson.name);
      return;
    }
    myApps = uiGlobals.myApps;
    uninstalledApps = uiGlobals.uninstalledApps;
    existingApp = myApps.get(appJson.appId) || uninstalledApps.get(appJson.appId);
    if (existingApp) {
      if (appJson.versionId > existingApp.get("versionId")) {
        console.log("Upgrade available for " + existingApp.get("name") + ". New version: " + appJson.version);
        existingApp.set("availableUpdate", appJson);
      } else {
        existingApp.set(appJson);
      }
      return existingApp;
    } else {
      console.log('Adding', appJson.name);
      try {
        app = myApps.add(appJson, {
          validate: true,
          silent: silent
        });
      } catch (_error) {
        err = _error;
        console.error("Corrupt app data from api: " + appJson + "\n" + (err.stack || err));
      }
    }
    return installManager.showAppropriateDownloadControl();
  };

  syncToCollection = function(appJsonList, collection, appTest) {
    var existingAppsById;
    existingAppsById = {};
    collection.forEach(function(app) {
      if (appTest(app)) {
        return existingAppsById[app.get('name')] = app;
      }
    });
    appJsonList.forEach(function(appJson) {
      var existingApp;
      existingApp = existingAppsById[appJson.name];
      if (existingApp) {
        delete existingAppsById[appJson.name];
        return existingApp.set(appJson);
      } else {
        return handleAppJson(appJson);
      }
    });
    _(existingAppsById).forEach(function(oldApp) {
      return collection.remove(oldApp);
    });
    return collection.save();
  };

  subscribeToUserChannel = function(userId) {
    return pubnub.subscribe(userId + ".user.purchased", function(appJson) {
      nwGui.Window.get().focus();
      return getAppJson(appJson.app_id).then(function(appJson) {
        return handleAppJson(appJson);
      }).done();
    });
  };

  subscribeToAppChannel = function(appId) {
    return pubnub.subscribe(appId + ".app.updated", function(appJson) {
      return getAppJson(appJson.app_id).then(function(appJson) {
        return handleAppJson(appJson);
      }).done();
    });
  };

  reconnectionPromise = void 0;

  reconnectAfterError = function(err) {
    console.log("Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (err && err.stack ? err.stack : err));
    if (reconnectionPromise != null) {
      return reconnectionPromise;
    }
    return reconnectionPromise = connectToStoreServer.delay(config.ServerConnectRetryMs).then(function() {
      return reconnectionPromise = void 0;
    });
  };

  _getStoreManifest = function() {
    reconnectionPromise = void 0;
    return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
      var apiEndpoint, platform;
      platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
      apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify({
        access_token: accessToken,
        platform: platform
      });
      console.log("Getting store manifest from", apiEndpoint);
      return httpHelper.getJson(apiEndpoint).then(function(messages) {
        var appJson, userInformation;
        if (messages.errors) {
          return reconnectAfterError(new Error(messages.errors));
        } else {
          userInformation = messages.shift();
          messages = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = messages.length; _i < _len; _i++) {
              appJson = messages[_i];
              appJson.appType = LeapApp.Types.StoreApp;
              _results.push(cleanAppJson(appJson));
            }
            return _results;
          })();
          messages.unshift(userInformation);
          return messages;
        }
      }, function(reason) {
        return reconnectAfterError(reason);
      });
    }, function(reason) {
      return reconnectAfterError(reason);
    });
  };

  getNonStoreManifest = function() {
    return httpHelper.getJson(config.NonStoreAppManifestUrl).then(function(manifest) {
      var appJson, _i, _j, _len, _len1, _ref, _ref1;
      manifest.local = manifest[NodePlatformToServerPlatform[os.platform()]] || [];
      _ref = manifest.web;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        appJson = _ref[_i];
        appJson.cleaned = true;
        appJson.appType = LeapApp.Types.WebApp;
      }
      _ref1 = manifest.local;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        appJson = _ref1[_j];
        appJson.cleaned = true;
        appJson.appType = LeapApp.Types.LocalApp;
        appJson.platform = os.platform();
      }
      return manifest;
    }, function(reason) {
      console.warn("Failed to get app manifest (retrying): " + err && err.stack);
      return Q.delay(config.S3ConnectRetryMs.then(function() {
        return _getNonStoreManifest();
      }));
    });
  };

  _setGlobalUserInformation = function(user) {
    uiGlobals.username = user.username;
    uiGlobals.email = user.email;
    uiGlobals.user_id = user.user_id;
    subscribeToUserChannel(user.user_id);
    return uiGlobals.trigger(uiGlobals.Event.SignIn);
  };

  getUserInformation = function(cb) {
    return _getStoreManifest(function(manifest) {
      _setGlobalUserInformation(manifest.shift());
      return typeof cb === "function" ? cb(null) : void 0;
    });
  };

  connectToStoreServer = function() {
    return _getStoreManifest().then(function(messages) {
      console.log("Connected to store server.", messages.length - 1, "apps found.");
      $("body").removeClass("loading");
      _setGlobalUserInformation(messages.shift());
      return messages.forEach(function(message) {
        return _.defer(function() {
          if (message.auth_id && message.secret_token) {
            drm.writeXml(message.auth_id, message.secret_token);
          }
          subscribeToAppChannel(message.appId);
          return handleAppJson(message);
        });
      });
    });
  };

  getAppJson = function(appId) {
    return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
      var platform;
      platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
      url = config.AppJsonEndpoint + "?" + qs.stringify({
        access_token: accessToken,
        platform: platform
      });
      url = url.replace(":id", appId);
      console.log("Getting app details via url: " + url);
      return httpHelper.getJson(url).then(function(appJson) {
        appJson.appType = LeapApp.Types.StoreApp;
        return cleanAppJson(appJson);
      });
    });
  };

  sendDeviceData = function() {
    var authDataFile, dataDir;
    if (uiGlobals.metricsDisabled) {
      console.log("Would have sent device data if metrics were enabled.");
      return Q();
    }
    dataDir = config.PlatformLeapDataDirs[os.platform()];
    if (!dataDir) {
      console.error("Leap Motion data dir unknown for operating system: " + os.platform());
      return Q.reject(new Error("Leap Motion data dir unknown for operating system: " + os.platform()));
    }
    authDataFile = path.join(dataDir, "lastauth");
    if (!fs.existsSync(authDataFile)) {
      console.warn("Auth data file doesn't exist");
      throw new Error("Auth data file doesn't exist");
    }
    return Q.nfcall(fs.readFile, authDataFile, "utf-8").then(function(authData) {
      if (!authData) {
        console.warn("Auth data file is empty.");
        throw new Error("Auth data file is empty.");
      }
      return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
        return httpHelper.post(config.DeviceDataEndpoint, {
          access_token: accessToken,
          data: authData
        }).then(function() {
          return console.log("Sent device data.");
        }, function(reason) {
          console.error("Failed to send device data: " + (reason.stack || reason));
          throw reason;
        });
      }, function(reason) {
        console.warn("Failed to get an access token: " + (err.stack || err));
        throw reason;
      });
    }, function(reason) {
      console.warn("Error reading auth data file.");
      throw reason;
    });
  };

  sendAppVersionData = function() {
    var appVersionData, myAppsVersionData, uninstalledAppsVersionData;
    if (uiGlobals.metricsDisabled) {
      console.log("Would have sent app version data if metrics were enabled");
      return Q();
    }
    myAppsVersionData = uiGlobals.myApps.filter(function(app) {
      return app.isStoreApp();
    }).map(function(app) {
      return {
        app_id: app.get("id"),
        app_version_id: app.get("versionId"),
        trashed: false
      };
    });
    uninstalledAppsVersionData = uiGlobals.uninstalledApps.filter(function(app) {
      return app.isStoreApp();
    }).map(function(app) {
      return {
        app_id: app.get("id"),
        app_version_id: app.get("versionId"),
        trashed: true
      };
    });
    appVersionData = myAppsVersionData.concat(uninstalledAppsVersionData);
    console.log("Sending app version data for", appVersionData.length, 'apps.');
    return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
      return httpHelper.post(config.AppVersionDataEndpoint, {
        access_token: accessToken,
        installations: JSON.stringify(appVersionData)
      }).then(function(result) {
        return console.log("Sent app version data.  Got " + result);
      }, function(reason) {
        console.error("Failed to send app version data: " + (reason.stack || reason));
        throw reason;
      });
    });
  };

  parsePrebundledManifest = function(manifest, cb) {
    var installationFunctions;
    console.log("\n\n\nExamining prebundle manifest \n" + JSON.stringify(manifest || {}, null, 2));
    installationFunctions = [];
    manifest.forEach(function(appJson) {
      var app;
      appJson.noAutoInstall = true;
      appJson.cleaned = true;
      app = handleAppJson(appJson);
      app.set("state", LeapApp.States.Waiting);
      return installationFunctions.push(function(callback) {
        console.log("Installing prebundled app: " + app.get("name"));
        return app.install(function(err) {
          if (err) {
            console.error("Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + (err.stack || err));
          } else {
            getAppJson(app.get('appId')).then(function(appJson) {
              app.set(appJson);
              return app.save();
            }).done();
            subscribeToAppChannel(app.get("appId"));
          }
          return callback(null);
        });
      });
    });
    return async.parallelLimit(installationFunctions, 2, function(err) {
      installManager.showAppropriateDownloadControl();
      return typeof cb === "function" ? cb(err) : void 0;
    });
  };

  module.exports.connectToStoreServer = connectToStoreServer;

  module.exports.getNonStoreManifest = getNonStoreManifest;

  module.exports.getUserInformation = getUserInformation;

  module.exports.getAppJson = getAppJson;

  module.exports.handleAppJson = handleAppJson;

  module.exports.syncToCollection = syncToCollection;

  module.exports.sendDeviceData = sendDeviceData;

  module.exports.sendAppVersionData = sendAppVersionData;

  module.exports.parsePrebundledManifest = parsePrebundledManifest;

}).call(this);

/*
//@ sourceMappingURL=api.map
*/

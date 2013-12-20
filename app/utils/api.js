// Generated by CoffeeScript 1.6.3
(function() {
  var LeapApp, NodePlatformToServerPlatform, Q, ServerPlatformToNodePlatform, WebLinkApp, appDetailsQueue, appsAdded, async, cleanUpAppJson, config, connectToStoreServer, createAppModel, createWebLinkApps, db, domain, drm, enumerable, fs, getAppDetails, getAppDetailsForNextInQueue, getLocalAppManifest, getUserInformation, handleAppJson, handleNotification, httpHelper, installManager, oauth, os, parsePrebundledManifest, path, pubnub, qs, reconnectAfterError, reconnectionTimeoutId, semver, sendAppVersionData, sendDeviceData, subscribeToAppChannel, subscribeToUserChannel, subscribeToUserNotifications, url, _getStoreManifest, _setGlobalUserInformation;

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

  httpHelper = require("./http-helper.js");

  installManager = require("./install-manager.js");

  drm = require("./drm.js");

  enumerable = require("./enumerable.js");

  httpHelper = require("./http-helper.js");

  oauth = require("./oauth.js");

  pubnub = require("./pubnub.js");

  semver = require("./semver.js");

  LeapApp = require("../models/leap-app.js");

  WebLinkApp = require("../models/web-link-app.js");

  NodePlatformToServerPlatform = {
    darwin: "osx",
    win32: "windows"
  };

  ServerPlatformToNodePlatform = {};

  Object.keys(NodePlatformToServerPlatform).forEach(function(key) {
    return ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key;
  });

  appsAdded = 0;

  cleanUpAppJson = function(appJson) {
    var cleanAppJson, releaseDate;
    appJson = appJson || {};
    releaseDate = appJson.certified_at || appJson.created_at;
    cleanAppJson = {
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
      tagline: appJson.tagline,
      releaseDate: (releaseDate ? new Date(releaseDate).toLocaleDateString() : null),
      noAutoInstall: appJson.noAutoInstall
    };
    Object.keys(cleanAppJson).forEach(function(key) {
      if (!cleanAppJson[key]) {
        return delete cleanAppJson[key];
      }
    });
    return cleanAppJson;
  };

  createAppModel = function(appJson) {
    var StoreLeapApp, cleanAppJson, newApp;
    cleanAppJson = cleanUpAppJson(appJson);
    if (cleanAppJson.platform === os.platform()) {
      StoreLeapApp = require("../models/store-leap-app.js");
      newApp = new StoreLeapApp(cleanAppJson);
      newApp.set("firstSeenAt", (new Date()).getTime());
      return newApp;
    } else {
      return null;
    }
  };

  handleAppJson = function(appJson) {
    var app, err, existingApp, myApps, uninstalledApps;
    app = createAppModel(appJson);
    if (app) {
      myApps = uiGlobals.myApps;
      uninstalledApps = uiGlobals.uninstalledApps;
      existingApp = myApps.get(app.get("appId")) || uninstalledApps.get(app.get("appId"));
      if (existingApp) {
        if (existingApp.isInstallable()) {
          getAppDetails(app, function() {
            appJson = app.toJSON();
            delete appJson.state;
            return existingApp.set(appJson);
          });
        } else if (app.get("versionId") > existingApp.get("versionId")) {
          console.log("Upgrade available for " + app.get("name") + ". New version: " + app.get("version"));
          existingApp.set("availableUpdate", app);
          getAppDetails(app);
        } else {
          setTimeout(function() {
            return getAppDetails(app, function() {
              appJson = app.toJSON();
              delete appJson.state;
              return existingApp.set(appJson);
            });
          }, _.random(5, 10));
        }
      } else {
        if (appsAdded >= 40) {
          console.error("Downloaded metadata for too many apps. Please restart Airspace Home to see your remaining purchases.");
          return;
        }
        try {
          myApps.add(app);
          appsAdded += 1;
          getAppDetails(app);
        } catch (_error) {
          err = _error;
          console.error("Corrupt app data from api: " + appJson + "\n" + (err.stack || err));
        }
      }
    }
    return app;
  };

  handleNotification = function(notificationJson) {
    return console.log("got notification", notificationJson);
  };

  subscribeToUserNotifications = function(userId) {
    pubnub.history(10, "notification", function() {
      return handleNotification.apply(this, arguments);
    });
    return pubnub.history(10, "notification", function() {
      return handleNotification.apply(this, arguments);
    });
  };

  subscribeToUserChannel = function(userId) {
    return pubnub.subscribe(userId + ".user.purchased", function() {
      nwGui.Window.get().focus();
      return handleAppJson.apply(this, arguments);
    });
  };

  subscribeToAppChannel = function(appId) {
    return pubnub.subscribe(appId + ".app.updated", function(appJson) {
      handleAppJson(appJson);
      return installManager.showAppropriateDownloadControl();
    });
  };

  reconnectionTimeoutId = void 0;

  reconnectAfterError = function(err) {
    console.log("Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (err && err.stack ? err.stack : err));
    if (!reconnectionTimeoutId) {
      return reconnectionTimeoutId = setTimeout(function() {
        return connectToStoreServer();
      }, config.ServerConnectRetryMs);
    }
  };

  _getStoreManifest = function(cb) {
    reconnectionTimeoutId = null;
    return oauth.getAccessToken(function(err, accessToken) {
      var apiEndpoint, platform;
      if (err) {
        return reconnectAfterError(err);
      } else {
        platform = NodePlatformToServerPlatform[os.platform()] || os.platform();
        apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify({
          access_token: accessToken,
          platform: platform
        });
        return httpHelper.getJson(apiEndpoint).then(function(messages) {
          if (messages.errors) {
            return reconnectAfterError(new Error(messages.errors));
          } else {
            return cb(messages);
          }
        }, function(reason) {
          return reconnectAfterError(reason);
        });
      }
    });
  };

  _setGlobalUserInformation = function(user) {
    uiGlobals.username = user.username;
    uiGlobals.email = user.email;
    uiGlobals.user_id = user.user_id;
    subscribeToUserChannel(user.user_id);
    subscribeToUserNotifications(user.user_id);
    return uiGlobals.trigger(uiGlobals.Event.SignIn);
  };

  getUserInformation = function(cb) {
    return _getStoreManifest(function(manifest) {
      _setGlobalUserInformation(manifest.shift());
      return typeof cb === "function" ? cb(null) : void 0;
    });
  };

  connectToStoreServer = function() {
    return _getStoreManifest(function(messages) {
      console.log("Connected to store server. Got messages: ", JSON.stringify(messages));
      $("body").removeClass("loading");
      messages.forEach(function(message) {
        var app;
        if (message.auth_id && message.secret_token) {
          drm.writeXml(message.auth_id, message.secret_token);
        }
        if (message.user_id) {
          return _setGlobalUserInformation(message);
        } else {
          app = handleAppJson(message);
          if (app) {
            return subscribeToAppChannel(app.get("appId"));
          }
        }
      });
      return installManager.showAppropriateDownloadControl();
    });
  };

  appDetailsQueue = [];

  getAppDetailsForNextInQueue = function() {
    var queuedData;
    queuedData = appDetailsQueue.shift();
    if (queuedData) {
      return getAppDetails(queuedData.app, queuedData.cb);
    }
  };

  getAppDetails = function(app, cb) {
    var appId, platform;
    if (appDetailsQueue.length > 0) {
      return appDetailsQueue.push({
        app: app,
        cb: cb
      });
    } else {
      appId = app.get("appId");
      platform = NodePlatformToServerPlatform[os.platform()];
      if (appId && platform) {
        return oauth.getAccessToken(function(err, accessToken) {
          if (err) {
            if (typeof cb === "function") {
              cb(err);
            }
            return getAppDetailsForNextInQueue();
          }
          url = config.AppDetailsEndpoint;
          url = url.replace(":id", appId);
          url = url.replace(":platform", platform);
          url += "?access_token=" + accessToken;
          console.log("Getting app details via url: " + url);
          return httpHelper.getJson(url).then(function(appDetails) {
            app.set(cleanUpAppJson(appDetails && appDetails.app_version));
            app.set("gotDetails", true);
            console.log("Got details for", app.get('name'));
            return app.save();
          }).fin(function() {
            cb = null;
            return getAppDetailsForNextInQueue();
          }).nodeify(cb);
        });
      } else {
        if (typeof cb === "function") {
          cb(new Error("appId and platform must be valid"));
        }
        return getAppDetailsForNextInQueue();
      }
    }
  };

  createWebLinkApps = function(webAppData) {
    var existingWebAppsById;
    webAppData = webAppData || [];
    existingWebAppsById = {};
    uiGlobals.myApps.forEach(function(app) {
      if (app.isWebLinkApp()) {
        return existingWebAppsById[app.get("id")] = app;
      }
    });
    webAppData.forEach(function(webAppDatum) {
      var err, existingWebApp, id, webApp;
      webApp = new WebLinkApp(webAppDatum);
      id = webApp.get("id");
      existingWebApp = existingWebAppsById[id];
      if (existingWebApp) {
        existingWebApp.set(webAppDatum);
        console.log("Updating existing web link: " + existingWebApp.get("name"));
        delete existingWebAppsById[id];
        return existingWebApp.save();
      } else {
        try {
          uiGlobals.myApps.add(webApp);
        } catch (_error) {
          err = _error;
          console.error("Corrupt webApp: " + webApp + "\n" + (err.stack || err));
        }
        console.log("Added web link: ", webApp.get("urlToLaunch"));
        return webApp.save();
      }
    });
    return Object.keys(existingWebAppsById).forEach(function(id) {
      var oldWebApp;
      oldWebApp = existingWebAppsById[id];
      if (oldWebApp.isBuiltinTile()) {
        console.log("Deleting old builtin web link: " + oldWebApp.get("name"));
        uiGlobals.myApps.remove(oldWebApp);
        return oldWebApp.save();
      }
    });
  };

  getLocalAppManifest = function() {
    return httpHelper.getJson(config.NonStoreAppManifestUrl).then(function(manifest) {
      createWebLinkApps(manifest.web);
      return manifest[NodePlatformToServerPlatform[os.platform()]] || [];
    }, function(reason) {
      var deferred;
      console.warn("Failed to get app manifest (retrying): " + err && err.stack);
      deferred = Q.deferred();
      setTimeout((function() {
        return deferred.resolve(getLocalAppManifest());
      }), config.S3ConnectRetryMs);
      return deferred.promise;
    });
  };

  sendDeviceData = function(cb) {
    var authDataFile, dataDir;
    dataDir = config.PlatformLeapDataDirs[os.platform()];
    if (!dataDir) {
      console.error("Leap Motion data dir unknown for operating system: " + os.platform());
      return typeof cb === "function" ? cb(new Error("Leap Motion data dir unknown for operating system: " + os.platform())) : void 0;
    }
    authDataFile = path.join(dataDir, "lastauth");
    return fs.readFile(authDataFile, "utf-8", function(err, authData) {
      if (err) {
        console.warn("Error reading auth data file.");
        return typeof cb === "function" ? cb(null) : void 0;
      }
      if (!authData) {
        console.warn("Auth data file is empty.");
        return typeof cb === "function" ? cb(null) : void 0;
      }
      return oauth.getAccessToken(function(err, accessToken) {
        if (err) {
          console.warn("Failed to get an access token: " + (err.stack || err));
          return typeof cb === "function" ? cb(null) : void 0;
        }
        return httpHelper.post(config.DeviceDataEndpoint, {
          access_token: accessToken,
          data: authData
        }).then(function() {
          return console.log("Sent device data.");
        }, function(reason) {
          console.error("Failed to send device data: " + (reason.stack || reason));
          throw reason;
        }).nodeify(cb);
      });
    });
  };

  sendAppVersionData = function(cb) {
    var appVersionData, myAppsVersionData, uninstalledAppsVersionData;
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
    console.log("Sending App Version Data:" + JSON.stringify(appVersionData, null, 2));
    return oauth.getAccessToken(function(err, accessToken) {
      if (err) {
        console.warn("Failed to get an access token: " + (err.stack || err));
        return typeof cb === "function" ? cb(err) : void 0;
      } else {
        return httpHelper.post(config.AppVersionDataEndpoint, {
          access_token: accessToken,
          installations: JSON.stringify(appVersionData)
        }).then(function(result) {
          return console.log("Sent app version data.  Got " + result);
        }, function(reason) {
          console.error("Failed to send app version data: " + (reason.stack || reason));
          throw reason;
        }).nodeify(cb);
      }
    });
  };

  parsePrebundledManifest = function(manifest, cb) {
    var installationFunctions;
    console.log("\n\n\nExamining prebundle manifest \n" + JSON.stringify(manifest || {}, null, 2));
    installationFunctions = [];
    manifest.forEach(function(appJson) {
      var app;
      appJson.noAutoInstall = true;
      if (!uiGlobals.myApps.get(appJson.app_id)) {
        app = createAppModel(appJson);
        if (app) {
          uiGlobals.myApps.add(app);
          app.set("state", LeapApp.States.Waiting);
          return installationFunctions.push(function(callback) {
            console.log("Installing prebundled app: " + app.get("name"));
            return app.install(function(err) {
              if (err) {
                console.error("Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + (err.stack || err));
              } else {
                getAppDetails(app);
                subscribeToAppChannel(app.get("appId"));
              }
              return callback(null);
            });
          });
        } else {
          return console.log("App model not created.  Skipping " + appJson.name);
        }
      }
    });
    return async.parallelLimit(installationFunctions, 2, function(err) {
      installManager.showAppropriateDownloadControl();
      return typeof cb === "function" ? cb(err) : void 0;
    });
  };

  module.exports.connectToStoreServer = connectToStoreServer;

  module.exports.getUserInformation = getUserInformation;

  module.exports.getLocalAppManifest = getLocalAppManifest;

  module.exports.getAppDetails = getAppDetails;

  module.exports.sendDeviceData = sendDeviceData;

  module.exports.sendAppVersionData = sendAppVersionData;

  module.exports.parsePrebundledManifest = parsePrebundledManifest;

}).call(this);

/*
//@ sourceMappingURL=api.map
*/

// Generated by CoffeeScript 1.7.1
(function() {
  var LeapApp, Q, async, cleanAppJson, config, connectToStoreServer, db, domain, drm, embeddedLeap, enumerable, fs, getAppJson, getNonStoreManifest, getUserInformation, handleAppJson, httpHelper, hydrateCachedModels, installManager, oauth, os, parsePrebundledManifest, path, pubnub, qs, reconnectAfterError, reconnectionPromise, semver, sendAppVersionData, sendDeviceData, subscribeToAppChannel, subscribeToUserChannel, subscribeToUserReloadChannel, syncToCollection, url, _getStoreManifest, _setGlobalUserInformation;

  async = require("async");

  domain = require("domain");

  fs = require("fs-extra");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  semver = require("./semver.js");

  url = require("url");

  Q = require("q");

  config = require("../../config/config.js");

  db = require("./db.js");

  drm = require("./drm.js");

  enumerable = require("./enumerable.js");

  httpHelper = require("./http-helper.js");

  installManager = require("./install-manager.js");

  embeddedLeap = require('./embedded-leap.js');

  oauth = require("./oauth.js");

  pubnub = require("./pubnub.js");

  LeapApp = require("../models/leap-app.js");

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
      isV2: appJson.is_v2,
      ribbonText: appJson.ribbon || false,
      platform: config.ServerPlatformToNodePlatform[appJson.platform] || appJson.platform,
      iconUrl: appJson.icon_url,
      tileUrl: appJson.tile_url,
      binaryUrl: appJson.binary_url,
      version: appJson.version_number,
      changelog: appJson.changelog,
      description: appJson.description,
      tagline: appJson.tagline,
      releaseDate: (releaseDate ? new Date(releaseDate).toLocaleDateString() : null),
      noAutoInstall: appJson.noAutoInstall,
      markedForRemoval: appJson.marked_for_removal,
      cleaned: true
    };
    Object.keys(cleanedAppJson).forEach(function(key) {
      if (cleanedAppJson[key] === void 0) {
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
    app = void 0;
    if (!appJson.cleaned) {
      appJson = cleanAppJson(appJson);
    }
    if (!((appJson.urlToLaunch != null) || (appJson.findByScanning != null) || ((appJson.platform != null) && appJson.platform === os.platform()))) {
      console.log("Skipping invalid app for this platform:", appJson);
      return;
    }
    myApps = uiGlobals.myApps;
    uninstalledApps = uiGlobals.uninstalledApps;
    existingApp = myApps.get(appJson.id) || uninstalledApps.get(appJson.id);
    if (existingApp) {
      if (semver.isFirstGreaterThanSecond(appJson.version, existingApp.get("version"))) {
        console.log("Upgrade available for " + existingApp.get("name") + ". New version: " + appJson.version);
        existingApp.set("availableUpdate", appJson);
      } else {
        existingApp.set(appJson);
      }
      if (existingApp.get('markedForRemoval')) {
        existingApp.uninstall();
      }
      app = existingApp;
    } else if (appJson.markedForRemoval !== true) {
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
    installManager.showAppropriateDownloadControl();
    return app;
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
      var existingApp, key;
      key = appJson.name;
      existingApp = existingAppsById[key];
      if (!existingApp && key === 'Leap Motion App Store') {
        key = 'Airspace Store';
        existingApp = existingAppsById[key];
      }
      if (!existingApp && key === 'Playground') {
        key = 'Orientation';
        existingApp = existingAppsById[key];
      }
      if (existingApp) {
        delete existingAppsById[key];
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

  subscribeToUserReloadChannel = function(userId) {
    return pubnub.subscribe(userId + ".user.reload", function() {
      var win;
      console.log('Update user identity');
      console.log('Reset access token');
      if (typeof guiders !== "undefined" && guiders !== null) {
        guiders.hideAll();
      }
      oauth.resetAccessToken();
      console.log('Reconnect to server');
      connectToStoreServer();
      win = nwGui.Window.get();
      win.show();
      win.focus();
      return $('#login-status').css('display', 'none');
    });
  };

  subscribeToUserChannel = function(userId) {
    return pubnub.subscribe(userId + ".user.purchased", function(appJson) {
      var win;
      win = nwGui.Window.get();
      win.show();
      win.focus();
      $('#login-status').css('display', 'none');
      if (!((appJson != null) && (config.ServerPlatformToNodePlatform[appJson.platform] || appJson.platform) === os.platform())) {
        return Q();
      }
      return getAppJson(appJson.app_id).then(function(appJson) {
        return handleAppJson(appJson);
      }).done();
    }, {
      connect: function() {
        return pubnub.history(20, "" + userId + ".user.purchased", function(data) {
          var appJson, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            appJson = data[_i];
            if (appJson) {
              if ((config.ServerPlatformToNodePlatform[appJson.platform] || appJson.platform) === os.platform()) {
                _results.push(getAppJson(appJson.app_id).then(function(appJson) {
                  return handleAppJson(appJson);
                }).done());
              } else {
                _results.push(void 0);
              }
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        });
      }
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
    console.log("Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (err != null ? err.stack : void 0) || err);
    if (reconnectionPromise != null) {
      return reconnectionPromise;
    }
    return reconnectionPromise = Q.delay(config.ServerConnectRetryMs).then(function() {
      connectToStoreServer();
      return reconnectionPromise = void 0;
    });
  };

  hydrateCachedModels = function() {
    var populateCollectionFromDb, userHomeDir;
    console.log('Rehydrating leap apps from database');
    userHomeDir = config.UserHomeDirs[os.platform()];
    populateCollectionFromDb = function(dbKey, targetCollection) {
      var appJson, appJsonList, err, _i, _len, _results;
      appJsonList = db.fetchObj(dbKey) || [];
      _results = [];
      for (_i = 0, _len = appJsonList.length; _i < _len; _i++) {
        appJson = appJsonList[_i];
        try {
          if (appJson.executable) {
            appJson.executable = appJson.executable.replace(/^%USER_DIR%/, userHomeDir);
          }
          if (appJson.state === LeapApp.States.Uninstalled) {
            if (appJson.markedForRemoval !== true) {
              _results.push(uiGlobals.uninstalledApps.add(appJson));
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(handleAppJson(appJson));
          }
        } catch (_error) {
          err = _error;
          console.error('corrupt app data in database: ' + appJson);
          _results.push(console.error('Error: ' + (err.stack || err)));
        }
      }
      return _results;
    };
    populateCollectionFromDb(config.DbKeys.InstalledApps, uiGlobals.myApps);
    populateCollectionFromDb(config.DbKeys.UninstalledApps, uiGlobals.uninstalledApps);
    return console.log('Done hydrating.');
  };

  _getStoreManifest = function() {
    reconnectionPromise = void 0;
    return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
      var apiEndpoint, platform;
      platform = config.NodePlatformToServerPlatform[os.platform()] || os.platform();
      apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify({
        access_token: accessToken,
        platform: platform,
        language: uiGlobals.locale,
        client_version: uiGlobals.appVersion
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
      manifest.local = manifest[config.NodePlatformToServerPlatform[os.platform()]] || [];
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
      console.warn("Failed to get app manifest (retrying): " + (reason != null ? reason.stack : void 0) || reason);
      return Q.delay(config.S3ConnectRetryMs).then(function() {
        return getNonStoreManifest();
      });
    });
  };

  _setGlobalUserInformation = function(user) {
    var win;
    drm.writeXml(user.auth_id, user.secret_token);
    uiGlobals.display_name = user.display_name;
    uiGlobals.is_ghost = user.is_ghost;
    uiGlobals.username = user.username;
    uiGlobals.email = user.email;
    uiGlobals.user_id = user.user_id;
    console.log('User with ID ' + user.user_id + ' logged in successfully');
    subscribeToUserChannel(user.user_id);
    subscribeToUserReloadChannel(user.user_id);
    if (uiGlobals.is_ghost) {
      $('#login-status').css('display', 'block');
    }
    win = nwGui.Window.get();
    win.show();
    return win.focus();
  };

  getUserInformation = function(cb) {
    return _getStoreManifest(function(manifest) {
      _setGlobalUserInformation(manifest.shift());
      uiGlobals.trigger(uiGlobals.Event.SignIn);
      return typeof cb === "function" ? cb(null) : void 0;
    });
  };

  connectToStoreServer = function() {
    uiGlobals.trigger(uiGlobals.Event.Connecting);
    return _getStoreManifest().then(function(messages) {
      if (messages == null) {
        return;
      }
      $("body").removeClass("loading");
      _setGlobalUserInformation(messages.shift());
      return _.defer(function() {
        messages.forEach(function(message) {
          subscribeToAppChannel(message.appId);
          return handleAppJson(message);
        });
        return uiGlobals.trigger(uiGlobals.Event.SignIn);
      });
    });
  };

  getAppJson = function(appId) {
    return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
      var platform;
      platform = config.NodePlatformToServerPlatform[os.platform()] || os.platform();
      url = config.AppJsonEndpoint + "?" + qs.stringify({
        access_token: accessToken,
        platform: platform,
        language: uiGlobals.locale
      });
      url = url.replace(":id", appId);
      console.log("Getting app details via url: " + url);
      return Q(httpHelper.getJson(url)).then(function(appJson) {
        console.log(appJson);
        appJson.appType = LeapApp.Types.StoreApp;
        return cleanAppJson(appJson);
      }).fail(function(e) {
        return {};
      });
    });
  };

  sendDeviceData = function() {
    var authDataFile, dataDir, waitForDeviceData;
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
    waitForDeviceData = function(retries, cb) {
      if (fs.existsSync(authDataFile)) {
        return cb();
      } else {
        if (retries < 1) {
          if (uiGlobals.embeddedDevice) {
            throw new Error("Auth data file doesn't exist");
          } else {
            return Q();
          }
        }
        console.log("Auth data file " + authDataFile + " not present, trying " + retries + " more times");
        return Q.delay(config.S3ConnectRetryMs).then(function() {
          return waitForDeviceData(retries - 1, cb);
        });
      }
    };
    return waitForDeviceData(3, function() {
      return Q.nfcall(fs.readFile, authDataFile, "utf-8").then(function(authData) {
        var device_type_override;
        if (!authData) {
          console.warn("Auth data file is empty.");
          throw new Error("Auth data file is empty.");
        }
        device_type_override = '';
        if (embeddedLeap.getEmbeddedDevice() === 'keyboard' && !uiGlobals.canInstallPrebundledApps) {
          device_type_override = 'TYPE_KEYBOARD_STANDALONE';
        }
        return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
          return httpHelper.post(config.DeviceDataEndpoint, {
            access_token: accessToken,
            data: authData,
            device_type_override: device_type_override
          }).then(function() {
            return console.log("Sent device data.");
          }, function(reason) {
            console.error("Failed to send device data: " + ((reason != null ? reason.stack : void 0) || reason));
            throw reason;
          });
        }, function(reason) {
          console.warn("Failed to get an access token: " + ((reason != null ? reason.stack : void 0) || reason));
          throw reason;
        });
      }, function(reason) {
        console.warn("Error reading auth data file.");
        throw reason;
      });
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
    console.log('Installing', manifest.length, 'prebundled apps');
    installationFunctions = [];
    manifest.forEach(function(appJson) {
      var app;
      appJson = cleanAppJson(appJson);
      appJson.noAutoInstall = true;
      appJson.platform = 'win32';
      appJson.appType = LeapApp.Types.StoreApp;
      app = handleAppJson(appJson);
      if (app == null) {
        console.warn('Skipping invalid prebundled app json', appJson);
        return;
      }
      app.set("state", LeapApp.States.Waiting);
      return installationFunctions.push(function(callback) {
        console.log("Installing prebundled app: " + app.get("name"));
        return app.install(function(err) {
          if (err != null) {
            console.error("Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + ((err != null ? err.stack : void 0) || err));
            subscribeToAppChannel(app.get("appId"));
          }
          return callback(null);
        });
      });
    });
    return async.parallelLimit(installationFunctions, 1, function(err) {
      installManager.showAppropriateDownloadControl();
      return typeof cb === "function" ? cb(err) : void 0;
    });
  };

  module.exports.hydrateCachedModels = hydrateCachedModels;

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

var api = require('./utils/api.js');
var async = require('async');
var config = require('../config/config.js');
var connection = require('./utils/connection.js');
var enumerable = require('./utils/enumerable.js');
var FsScanner = require('./utils/fs-scanner.js');
var oauth = require('./utils/oauth.js');
var semver = require('./utils/semver.js');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapApp = require('./models/leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');
var NoInternetView = require('./views/error-screens/no-internet/no-internet.js');

var AppErrors = enumerable.make([
  'InternetConnectionRequired'
], 'AppError');

function AppController() {
  this._accessToken = null;
  BuiltinTileApp.createBuiltinTiles();
  LeapApp.hydrateCachedModels();
}

AppController.prototype = {

  runApp: function() {
    async.waterfall([
      this._checkInternetConnection.bind(this),
      this._hideNoInternetError.bind(this),
      this._checkLeapConnection.bind(this),
      this._authorize.bind(this),
      this._afterAuthorize.bind(this)
    ], function(err) {
      if (err === AppErrors.InternetConnectionRequired) {
        this._showNoInternetError();
      }
      setTimeout(this.runApp.bind(this), 50); // Keep on trying...
    }.bind(this));

  },

  _checkInternetConnection: function(cb) {
    connection.check(function(ignored, isConnected) {
      if (!isConnected) {
        cb(oauth.getRefreshToken() ? null : AppErrors.InternetConnectionRequired);
      } else {
        cb(null);
      }
    });
  },

  _checkLeapConnection: function(cb) {
    // TODO
    cb(null);
  },

  _authorize: function(cb) {
    oauth.getAccessToken(function(err, accessToken) {
      if (err) {
        var authorizationView = new AuthorizationView();
        authorizationView.authorize(function(err) {
          if (err) {
            this._checkInternetConnection(cb);
          } else {
            this._authorize(cb);
          }
          authorizationView.remove();
        }.bind(this));
      } else {
        this._accessToken = accessToken;
        cb(null);
      }
    }.bind(this));
  },

  _afterAuthorize: function() {
    this._paintMainApp();
    this._scanFilesystem();
    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    //TODO: real server API
    this._pollServerForUpdates();
  },

  _paintMainApp: function() {
    $('body').append((new MainPage({
      offlineMode: this._offlineMode
    })).$el);
  },

  _scanFilesystem: function() {
    var fsScanner = new FsScanner(api.localApps());

    var existingLocalAppsById = {};
    var allApps = uiGlobals.installedApps.models.concat(uiGlobals.uninstalledApps.models);
    allApps.forEach(function(app) {
      if (app.isLocalApp()) {
        existingLocalAppsById[app.get('id')] = app;
      }
    });

    fsScanner.scan(function(err, apps) {
      if (!err) {
        apps.forEach(function(app) {
          console.log(app.get('name'));
          if (existingLocalAppsById[app.get('id')]) {
            delete existingLocalAppsById[app.get('id')];
            return;
          }
          console.log('installing app: ' + app.get('name'));
          uiGlobals.installedApps.add(app);
          app.install(function(err) {
            err && console.log('Failed to install app', app.get('name'), err.message);
          });
        });

        // the remaining ones are apps we previously detected but weren't found in this last scan,
        // which means they were uninstalled and need to be removed from the launcher
        _(existingLocalAppsById).forEach(function(app){
          app.uninstall(true, function() {
            uiGlobals.uninstalledApps.remove(app.get('id'));
            app.save(); // HACK, depends on app.save saving the whole collection
          });
        });
      }
    });
  },

  _pollServerForUpdates: function(installApps) {
    api.storeApps(function(err, apps) {
      if (!err) {
        apps.forEach(function(app) {
          if (uiGlobals.installedApps.get(app.get('id')) ||
              uiGlobals.uninstalledApps.get(app.get('id'))) {
            return;
          } else if (!installApps || app.isUpgrade()) {
            var existingUpgrade = uiGlobals.availableDownloads.findWhere({ appId: app.get('appId') });
            if (existingUpgrade && semver.isFirstGreaterThanSecond(app.get('version'), existingUpgrade.get('version'))) {
              uiGlobals.availableDownloads.remove(existingUpgrade);
              uiGlobals.availableDownloads.add(app);
            } else if (!existingUpgrade) {
              uiGlobals.availableDownloads.add(app);
            }
          } else {
            console.log('installing app: ' + app.get('name'));
            uiGlobals.installedApps.add(app);
            app.install(function(err) {
              err && console.log('Failed to install app', app.get('name'), err.message);
            });
          }
        });
      }
    });
  },

  _showNoInternetError: function() {
    if (!this._noInternetView) {
      this._noInternetView = new NoInternetView();
      this._noInternetView.$el.appendTo('body');
    }
    this._noInternetView.$el.show();
  },

  _hideNoInternetError: function() {
    this._noInternetView && this._noInternetView.$el.hide();
  }

};

module.exports = AppController;

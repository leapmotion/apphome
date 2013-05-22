var api = require('./utils/api.js');
var FsScanner = require('./utils/fs-scanner.js');
var oauth = require('./utils/oauth.js');
var semver = require('./utils/semver.js');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapApp = require('./models/leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');

function AppController() {
}

AppController.prototype = {

  runApp: function() {
    BuiltinTileApp.createBuiltinTiles();
    LeapApp.hydrateCachedModels();

    this._authorize(function(err, accessToken) {
      console.log(err ? 'ERROR: ' + err : 'Access Token: ' + accessToken);
      this._paintPage();
      this._scanFilesystem();
      this._pollServerForUpdates();
    }.bind(this));
  },

  _paintPage: function() {
    $('body').append((new MainPage()).$el);
  },

  _authorize: function(cb) {
    oauth.getAccessToken(function(err, accessToken) {
      if (err) {
        var authorizationView = new AuthorizationView();
        authorizationView.authorize(function(err) {
          if (err) {
            cb && cb(err);
          } else {
            this._authorize(cb);
          }
        }.bind(this));
      } else {
        cb(null, accessToken)
      }
    }.bind(this));
  },

  _scanFilesystem: function() {
    var fsScanner = new FsScanner(api.localApps());
    fsScanner.scan(function(err, apps) {
      if (!err) {
        apps.forEach(function(app) {
          if (uiGlobals.installedApps.get(app.get('id')) ||
              uiGlobals.uninstalledApps.get(app.get('id'))) {
            return;
          }
          console.log('installing app: ' + app.get('name'));
          uiGlobals.installedApps.add(app);
          app.install(function(err) {
            err && console.log('Failed to install app', app.get('name'), err.message);
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
  }

};

module.exports = AppController;

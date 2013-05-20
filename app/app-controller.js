var FsScanner = require('./utils/fs-scanner.js');
var oauth = require('./utils/oauth.js');
var api = require('./utils/api.js');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');
var StoreLeapApp = require('./models/store-leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var PageContainerView = require('./views/page-container/page-container.js');

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
    $('body').append((new PageContainerView()).$el);
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
          if (uiGlobals.leapApps.get(app.get('id'))) {
            return;
          }
          console.log('installing app: ' + app.get('name'));
          uiGlobals.leapApps.add(app);
          app.install();
        });
      }
    });
  },

  _pollServerForUpdates: function() {
    api.storeApps(function(err, apps) {
      if (!err) {
        apps.forEach(function(app) {
          // TODO: detect upgrades
          if (uiGlobals.leapApps.get(app.get('id'))) {
            return;
          }
          console.log('installing app: ' + app.get('name'));
          uiGlobals.leapApps.add(app);
          app.install(function(err) {
            if (err) {
              console.log('Failed to install app', app.get('name'), err, err.stack);
            }
          });
        })
      }
    });
  }

};

module.exports = AppController;

var async = require('async');

var api = require('./utils/api.js');
var config = require('../config/config.js');
var db = require('./utils/db.js');
var enumerable = require('./utils/enumerable.js');
var FsScanner = require('./utils/fs-scanner.js');
var leap = require('./utils/leap.js');
var oauth = require('./utils/oauth.js');
var semver = require('./utils/semver.js');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapApp = require('./models/leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');

function AppController() {
}

AppController.prototype = {

  setupWindow: function() {
    this._createMenu();

    // TODO: persist window dimensions when user resizes it, and restore that size on launch
    nwGui.Window.get().maximize();
  },

  _createMenu: function(enableLogOut) {
    var mainMenu = new nwGui.Menu({ type: 'menubar' });
    var accountMenu = new nwGui.Menu();
    var accountMenuItem = new nwGui.MenuItem({
      label: 'Account',
      submenu: accountMenu
    });
    accountMenu.append(new nwGui.MenuItem({
      label: 'Sign Out',
      click: this._logOut.bind(this),
      enabled: !!enableLogOut
    }));
    mainMenu.append(accountMenuItem);
    nwGui.Window.get().menu = mainMenu;
  },

  restoreModels: function() {
    BuiltinTileApp.createBuiltinTiles();
    LeapApp.hydrateCachedModels();
  },

  runApp: function() {
    async.waterfall([
      this._checkLeapConnection.bind(this),
      this._authorize.bind(this),
      this._afterAuthorize.bind(this)
    ], function(err) {
      if (err) {
        setTimeout(this.runApp.bind(this), 50); // Keep on trying...
      }
    }.bind(this));
  },

  _checkLeapConnection: function(cb) {
    if (this._noMoreLeapConnectionChecks) {
      return cb(null);
    }
    var leapNotConnectedView = new LeapNotConnectedView();
    leapNotConnectedView.encourageConnectingLeap(function() {
      leapNotConnectedView.remove();
      this._noMoreLeapConnectionChecks = true;
      cb(null);
    }.bind(this));
  },

  _authorize: function(cb) {
    oauth.getAccessToken(function(err) {
      if (err) {
        var authorizationView = new AuthorizationView();
        authorizationView.authorize(function(err) {
          authorizationView.remove();
          cb && cb(null); // skip auth if there's an error
        }.bind(this));
      } else {
        cb && cb(null);
      }
    }.bind(this));
  },

  _afterAuthorize: function() {
    db.setItem(config.DbKeys.AlreadyDidFirstRun, true);

    this._paintMainApp();
    this._scanFilesystem();
    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    this._connectToStoreServer();
  },

  _logOut: function() {
    this._createMenu(false);
    if (this._mainPage) {
      this._mainPage.$el.remove();
      this._mainPage.remove();
    }
    var authorizationView = new AuthorizationView();
    authorizationView.logOut(function() {
      authorizationView.remove();
      this._authorize(this._paintMainApp.bind(this));
    }.bind(this));
  },

  _paintMainApp: function() {
    this._createMenu(true);
    this._mainPage = new MainPage();
    $('body').append(this._mainPage.$el);
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

  _connectToStoreServer: function() {
    api.connectToStoreServer(function(err) {
      if (err) {
        // retry
        setTimeout(this._connectToStoreServer.bind(this), 1000);
      }
    }.bind(this));
  }

};

module.exports = AppController;


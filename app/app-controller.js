var async = require('async')
var os = require('os');
var path = require('path');

var api = require('./utils/api.js');
var config = require('../config/config.js');
var db = require('./utils/db.js');
var enumerable = require('./utils/enumerable.js');
var FsScanner = require('./utils/fs-scanner.js');
var leap = require('./utils/leap.js');
var oauth = require('./utils/oauth.js');
var popupWindow = require('./utils/popup-window.js');

var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');

function AppController() {
}

AppController.prototype = {

  setupWindow: function() {
    var win = nwGui.Window.get();
    this._createMenu();
    win.show();
    win.maximize();
  },

  _createMenu: function(enableLogOut) {
    var mainMenu = new nwGui.Menu({ type: 'menubar' });

    if (os.platform() === 'win32') {
      var fileMenu = new nwGui.Menu();
      fileMenu.append(new nwGui.MenuItem({
        label: 'Controller Settings',
        click: function() {
          nwGui.Shell.openItem(path.join(process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES, 'Leap Motion', 'Core Services', 'LeapControlPanel.exe'))
        }
      }));
      fileMenu.append(new nwGui.MenuItem({
        label: 'Exit',
        click: process.exit
      }));
      mainMenu.append(new nwGui.MenuItem({
        label: 'File',
        submenu: fileMenu
      }));
    }

    var accountMenu = new nwGui.Menu();
    accountMenu.append(new nwGui.MenuItem({
      label: 'Sign Out',
      click: this._logOut.bind(this),
      enabled: !!enableLogOut
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: 'Account',
      submenu: accountMenu
    }));

    // TODO: support website links on both OS X and Windows
    if (os.platform() === 'win32') {
      var helpMenu = new nwGui.Menu();
      helpMenu.append(new nwGui.MenuItem({
        label: 'About ' + uiGlobals.appName,
        click: function() {
           popupWindow.open('/static/popups/about.html', {
              width: 300,
              height: 150,
              title: 'About ' + uiGlobals.appName
           });
        }
      }));
      mainMenu.append(new nwGui.MenuItem({
        label: 'Help',
        submenu: helpMenu
      }));
    }

    nwGui.Window.get().menu = mainMenu;
  },

  restoreModels: function() {
    LeapApp.hydrateCachedModels();
  },

  runApp: function() {
    api.getFrozenApps();
    this._scanFilesystem();
    $('body').removeClass('startup');
    this._checkLeapConnection();
    async.waterfall([
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
      return cb && cb(null);
    }
    var leapNotConnectedView = new LeapNotConnectedView();
    leapNotConnectedView.encourageConnectingLeap(function() {
      leapNotConnectedView.remove();
      this._noMoreLeapConnectionChecks = true;
      cb && cb(null);
    }.bind(this));
  },

  _authorize: function(cb) {
    if (!oauth.getRefreshToken()) {
      oauth.getAccessToken(cb);
    } else {
      cb(null);
    }
  },

  _afterAuthorize: function() {
    db.setItem(config.DbKeys.AlreadyDidFirstRun, true);

    this._paintMainApp();

    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    api.connectToStoreServer(true);
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
    if (this._scanningFilesystem) {
      return;
    }

    this._scanningFilesystem = true;
    console.log('Scanning filesystem for apps.');

    api.getLocalAppManifest(function(err, manifest) {
      if (err) {
        this._scanningFilesystem = false;
        return;
      }

      this._handleExplicitPathLocalApps(manifest);
      this._handleScannedLocalApps(manifest);
    }.bind(this));
  },

  _handleExplicitPathLocalApps: function(manifest) {
    var existingExplicitPathLocalAppsById = {};
    uiGlobals.installedApps.forEach(function(app) {
      if (app.isLocalApp() && !app.get('findByScanning')) {
        existingExplicitPathLocalAppsById[app.get('id')] = app;
      }
    });

    manifest.forEach(function(appToFind) {
      if (!appToFind.findByScanning) {
        try {
          var app = new LocalLeapApp(appToFind);
          if (app.isValid()) {
            var id = app.get('id');
            var existingApp = existingExplicitPathLocalAppsById[id];
            if (existingApp) {
              delete existingExplicitPathLocalAppsById[id];
              existingApp.set('iconUrl', app.get('iconUrl'));
              existingApp.set('tileUrl', app.get('tileUrl'));
            } else {
              console.log('New local app: ' + app.get('name'));
              app.install();
            }
          }
        } catch(e) {
          // app is not found
        }
      }
    });

    // remove old apps
    _(existingExplicitPathLocalAppsById).forEach(function (oldApp) {
      uiGlobals.installedApps.remove(oldApp);
      uiGlobals.uninstalledApps.remove(oldApp);
      oldApp.save();
    });
  },

  _handleScannedLocalApps: function(manifest) {
    var existingScannedLocalAppsById = {};
    var allApps = uiGlobals.installedApps.models.concat(uiGlobals.uninstalledApps.models);
    allApps.forEach(function(app) {
      if (app.isLocalApp() && app.get('findByScanning')) {
        existingScannedLocalAppsById[app.get('id')] = app;
      }
    });

    var fsScanner = new FsScanner(manifest);
    fsScanner.scan(function(err, apps) {
      this._scanningFilesystem = false;
      if (!err) {
        apps.forEach(function(app) {
          var id = app.get('id');
          if (existingScannedLocalAppsById[id]) {
            delete existingScannedLocalAppsById[id];
          } else {
            console.log('Found new local app: ' + app.get('name'));
            app.install();
          }
        });

        // remove old apps
        _(existingScannedLocalAppsById).forEach(function(oldApp){
          uiGlobals.installedApps.remove(oldApp);
          uiGlobals.uninstalledApps.remove(oldApp);
          oldApp.save();
        });
      }
    }.bind(this));
  }

};

module.exports = AppController;


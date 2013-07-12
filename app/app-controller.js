var async = require('async');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');

var api = require('./utils/api.js');
var config = require('../config/config.js');
var db = require('./utils/db.js');
var enumerable = require('./utils/enumerable.js');
var FsScanner = require('./utils/fs-scanner.js');
var installManager = require('./utils/install-manager.js');
var leap = require('./utils/leap.js');
var mixpanel = require('./utils/mixpanel.js');
var oauth = require('./utils/oauth.js');
var popupWindow = require('./utils/popup-window.js');
var shell = require('./utils/shell.js');

var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');

var PlatformControlPanelPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\LeapControlPanel.exe'
};

var PlatformOrientationCommands = {
  win32: shell.escape((process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe'),
  darwin: 'open ' + shell.escape('/Applications/Leap Motion Orientation.app')
};

function AppController() {
  uiGlobals.on(uiGlobals.Event.SignIn, function() {
    this._createMenu(true);
  }.bind(this));
}

AppController.prototype = {

  restoreModels: function() {
    LeapApp.hydrateCachedModels();
  },

  runApp: function() {
    if (uiGlobals.isFirstRun) {
      async.waterfall([
        this._checkIfEmbedded.bind(this),
        this._showFirstRunSplash.bind(this),
        this._launchOrientation.bind(this)
      ], this._setupWindow.bind(this));
    } else {
      this._setupWindow();
    }

    this._createMenu(false);
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

  _checkIfEmbedded: function(cb) {
    if (os.platform() === 'win32') {
      exec('reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS', function(err, stdout) {
        if (err) {
          this._isEmbedded = false;
        } else {
          var output = stdout.toString();
          // this is to detect HP pre-installed builds
          this._isEmbedded = /BIOSVersion\s+REG_SZ\s+B.22/.test(output) &&
                             /BaseBoardManufacturer\s+REG_SZ\s+Hewlett-Packard/.test(output);
        }
        cb && cb(null);
      }.bind(this));
    } else {
      this._isEmbedded = false;
      cb && cb(null);
    }
  },

  _showFirstRunSplash: function(cb) {
    var isEmbedded = this._isEmbedded;
    var firstRunSplash = popupWindow.open('/static/popups/first-run.html', {
      width: 1080,
      height: 638,
      frame: false,
      resizable: false,
      show: false
    });

    firstRunSplash.on('loaded', function() {
      var splashWindow = firstRunSplash.window;
      $(splashWindow.document.body).toggleClass('embedded', isEmbedded);
      splashWindow.setTimeout(function() {
        firstRunSplash.show();
      }, 0);
    });

    firstRunSplash.on('close', function() {
      this.close(true);
      cb && cb(null);
    });
  },

  _launchOrientation: function(cb) {
    var orientationCommand = PlatformOrientationCommands[os.platform()];
    if (orientationCommand) {
      mixpanel.trackEvent('Started Orientation', null, 'OOBE');
      exec(orientationCommand).on('exit', function() {
        mixpanel.trackEvent('Completed Orientation', null, 'OOBE');
        mixpanel.trackEvent('Airspace Auto-Launched', null, 'OOBE');
        cb && cb.apply(this, arguments);
      });
    } else {
      cb && cb(null);
    }
  },

  _setupWindow: function() {
    var win = nwGui.Window.get();
    win.show();
    win.maximize();
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);
  },

  _createMenu: function(enableLogOut) {
    var mainMenu = new nwGui.Menu({ type: 'menubar' });

    if (os.platform() === 'win32') {
      var fileMenu = new nwGui.Menu();
      fileMenu.append(new nwGui.MenuItem({
        label: 'Controller Settings',
        click: function() {
          nwGui.Shell.openItem(PlatformControlPanelPaths.win32);
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
      label: 'Sign Out' + (enableLogOut ? ' ' + (uiGlobals.username || uiGlobals.email) : ''),
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
    uiGlobals.isFirstRun = false;
    this._paintMainApp();

    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    api.sendDeviceData();
    api.connectToStoreServer();
  },

  _logOut: function() {
    installManager.cancelAll();
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
    uiGlobals.myApps.forEach(function(app) {
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
      uiGlobals.myApps.remove(oldApp);
      oldApp.save();
    });
  },

  _handleScannedLocalApps: function(manifest) {
    var existingScannedLocalAppsById = {};
    uiGlobals.myApps.forEach(function(app) {
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
          uiGlobals.myApps.remove(oldApp);
          oldApp.save();
        });
      }
    }.bind(this));
  }

};

module.exports = AppController;

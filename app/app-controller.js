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
var crashCounter = require('./utils/crash-counter.js');

var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var MainPage = require('./views/main-page/main-page.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');

var PlatformControlPanelPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\LeapControlPanel.exe'
};

var PlatformOrientationPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
  darwin: '/Applications/Leap Motion Orientation.app'
};

var EmbeddedDeviceDbKey = 'is_leap_embedded';
var embedCheckPromise;

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
    this._startBackgroundEmbedCheck();

    var steps = [];
    if (uiGlobals.isFirstRun) {
      steps = steps.concat(
        this._showFirstRunSplash.bind(this),
        this._launchOrientation.bind(this)
      );
    }
    steps = steps.concat(
      this._setupWindow.bind(this),

      function(cb) {
        this._createMenu(false);
        $('body').removeClass('startup');
        api.getFrozenApps();
        this._scanFilesystem();
        cb && cb(null)
      }.bind(this),

      this._checkLeapConnection.bind(this)
    );

    async.series(steps, function(err) {
      if (err) {
        console.error('\n\n\nCRITICAL. Error during bootstrap: ' + (err.stack || err));
        process.exit();
      }
    });

    // concurrently authorize in background:
    async.series([
      this._authorize.bind(this),
      this._afterAuthorize.bind(this)
    ], function(err) {
      if (err) {
        setTimeout(this.runApp.bind(this), 50); // Keep on trying...
      }
    }.bind(this));
  },

  _startBackgroundEmbedCheck: function() {
    var defer = $.Deferred();
    embedCheckPromise = defer.promise();
    var existingValue = db.getItem(EmbeddedDeviceDbKey);
    if (existingValue && existingValue.length) {
      defer.resolve(existingValue === 'true');
      return;
    }
    if (os.platform() === 'win32') {
      exec('reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS', function(err, stdoutBufferedResult, stderrBufferedResult) {
        var isEmbedded;
        if (err) {
          isEmbedded = 'no';
        } else {
          var output = stdoutBufferedResult.toString();
          // this is to detect HP pre-installed builds
          isEmbedded = /BIOSVersion\s+REG_SZ\s+B.22/.test(output) &&
                             /BaseBoardManufacturer\s+REG_SZ\s+Hewlett-Packard/.test(output);
        }
        db.setItem(EmbeddedDeviceDbKey, isEmbedded);
        defer.resolve(isEmbedded);
      }.bind(this));
    } else {
      db.setItem(EmbeddedDeviceDbKey, false);
      defer.resolve(false);
    }
  },

  _showFirstRunSplash: function(cb) {
    embedCheckPromise.done(function(isEmbedded) {
      this._firstRunSplash = popupWindow.open('/static/popups/first-run.html', {
        width: 1080,
        height: 638,
        frame: false,
        resizable: false,
        show: false
      });

      this._firstRunSplash.on('loaded', function() {
        var splashWindow = this._firstRunSplash.window;
        $(splashWindow.document.body).toggleClass('embedded', isEmbedded);
        var $continueButton = $('#continue', splashWindow.document);
        $continueButton.click(function() {
          mixpanel.trackEvent('Finished First Run Panel', null, 'OOBE');
          $continueButton.unbind('click');
          cb && cb(null);
        });
        splashWindow.setTimeout(function() {
          this._firstRunSplash.show();
          mixpanel.trackEvent('Displayed First Run Panel', null, 'OOBE');
        }.bind(this), 0);
      }.bind(this));
    }.bind(this));
  },

  _launchOrientation: function(cb) {
    var orientationPath = PlatformOrientationPaths[os.platform()];
    if (orientationPath) {
      mixpanel.trackEvent('Started Orientation', null, 'OOBE');
      setTimeout(function() {
        var $continueButton = $('#continue', this._firstRunSplash.window.document);
        $continueButton.text('Launch Airspace');
        $continueButton.click(function() {
          this._firstRunSplash.close();
          this._firstRunSplash = null;
          mixpanel.trackEvent('Completed Orientation', null, 'OOBE');
          mixpanel.trackEvent('Airspace Auto-Launched', null, 'OOBE');
          cb && cb(null);
        }.bind(this));
      }.bind(this), 5000);
      nwGui.Shell.openItem(orientationPath);
    } else {
      cb && cb(null);
    }
  },

  _setupWindow: function(cb) {
    var win = nwGui.Window.get();
    win.show();
    win.maximize();
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);
    cb && cb(null);
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
    embedCheckPromise.done(function(isEmbedded) {
      var leapNotConnectedView = new LeapNotConnectedView({ isEmbedded: isEmbedded });
      leapNotConnectedView.encourageConnectingLeap(function() {
        leapNotConnectedView.remove();
        this._noMoreLeapConnectionChecks = true;
        cb && cb(null);
      }.bind(this));

    });
  },

  _authorize: function(cb) {
    if (!oauth.getRefreshToken()) {
      oauth.getAccessToken(cb);
    } else {
      cb && cb(null);
    }
  },

  _afterAuthorize: function(cb) {
    uiGlobals.isFirstRun = false;
    this._paintMainApp();

    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    try {
      api.sendDeviceData();
    } catch (err) {
      console.error('Failed to send device data: ' + (err.stack + err));
    }
    api.connectToStoreServer();
    cb && cb(null);
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
    crashCounter.reset();
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

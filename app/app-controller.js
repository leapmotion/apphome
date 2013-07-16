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
var workingFile = require('./utils/working-file.js');
var eula = require('./utils/eula.js');

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
    // TODO: use asyncjs control structure to more explicitly start bootstrap tasks (has gotten messy)

    this._startBackgroundEmbedCheck();

    if (uiGlobals.isFirstRun) {
      async.waterfall([
        this._checkEulaState.bind(this),
        this._showFirstRunSplash.bind(this),
        this._launchOrientation.bind(this)
      ], this._setupWindow.bind(this));
    } else {
      this._setupWindow();
    }

    this._createMenu(false);
    api.getFrozenApps();
    workingFile.cleanup();
    this._scanFilesystem();
    this._checkLeapConnection();
    this._authorizeAndShowMainScreen();
    window.setTimeout(function() {
      $('body').removeClass('startup');
    }, 50);
  },

  _startBackgroundEmbedCheck: function() {
    if (embedCheckPromise) {
      return;
    }
    var defer = $.Deferred();
    embedCheckPromise = defer.promise();
    var existingValue = db.fetchObj(EmbeddedDeviceDbKey);
    if (existingValue && existingValue.length) {
      defer.resolve(existingValue);
      return;
    }
    if (os.platform() === 'win32') {
      exec('reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS', function(err, stdoutBufferedResult, stderrBufferedResult) {
        var isEmbedded;
        if (err) {
          isEmbedded = false;
        } else {
          var output = stdoutBufferedResult.toString();
          // this is to detect HP pre-installed builds
          isEmbedded = /BIOSVersion\s+REG_SZ\s+B.22/.test(output) &&
            /BaseBoardManufacturer\s+REG_SZ\s+Hewlett-Packard/.test(output);
        }
        db.saveObj(EmbeddedDeviceDbKey, isEmbedded);
        defer.resolve(isEmbedded);
      }.bind(this));
    } else {
      db.saveObj(EmbeddedDeviceDbKey, false);
      defer.resolve(false);
    }
  },

  _checkEulaState: function(cb) {
    eula.needsUpdating(function(err, needsUpdating) {
      if (err) {
        console.error('Error checking for eula, assuming it needs agreement. ' + (err.stack || err));
        uiGlobals.isEulaAgreed = false;
      } else {
        uiGlobals.isEulaAgreed = !needsUpdating;
      }
      cb && cb(null);
    });
  },

  // TODO: move this into its own view
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
        // hacky changes... in a hurry
        var splashWindow = this._firstRunSplash.window;
        $(splashWindow.document.body).toggleClass('embedded', isEmbedded);
        var $s = $('body', splashWindow.document);

        var $continueButton = $('#continue', splashWindow.document);
        $continueButton.click(function() {
          if ($continueButton.hasClass('disabled')) {
            $s.find('.validation').show();
            return;
          }
          this._markFirstRun();
          if (!uiGlobals.isEulaAgreed) {
            $s.find('.eula').css('visibility', 'hidden');
            this._markEulaAsAgreed();
          }
          mixpanel.trackEvent('Finished First Run Panel', null, 'OOBE');
          $continueButton.unbind('click');
          cb && cb(null);
        }.bind(this));

        if (uiGlobals.isEulaAgreed) {
          $continueButton.removeClass('disabled');
          $s.find('.eula').remove();
        } else {
          $s.find('.eula-popup').click(function() {
            var eulaWindow = popupWindow.open('/static/popups/license-en.html', {
              title: 'Leap Motion End User Software License Agreement',
              width: 640,
              height: 480,
              frame: true,
              resizable: true,
              show: true,
              x: 50,
              y: 50,
              allowMultiple: false
            });
          });

          var $checkbox = $s.find('.eula .checkbox');
          $checkbox.change(function(evt) {
            $continueButton.toggleClass('disabled', !$checkbox.is(':checked'));
            $s.find('.validation').hide();
          });
        }

        $s.find('.close-app').click(function() {
          process.exit();
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

  _setupWindow: function() {
    var win = nwGui.Window.get();
    win.show();
    win.maximize();
    win.setAlwaysOnTop(true);
    win.setAlwaysOnTop(false);
  },

  _markFirstRun: function() {
    db.setItem(config.DbKeys.AlreadyDidFirstRun, true);
  },

  _markEulaAsAgreed: function() {
    this._markFirstRun();
    eula.markAsAgreed(); // ignore errors.. used by leap controller to skip prompting the user, not end of world if it happens twice
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
    }.bind(this));
  },

  _authorizeAndShowMainScreen: function() {
    this._authorize(function(err) {
      if (err) {
        setTimeout(this._authorizeAndShowMainScreen.bind(this), 50); // Keep on trying...
      } else {
        this._afterAuthorize();
      }
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
      this._markFirstRun();

    this._paintMainApp();

    setInterval(this._scanFilesystem.bind(this), config.FsScanIntervalMs);

    try {
      api.sendDeviceData();
    } catch (err) {
      console.error('Failed to send device data: ' + (err.stack + err));
    }
    api.connectToStoreServer();
  },

  _logOut: function() {
    installManager.cancelAll();
    api.unsubscribeAllPubnubChannels();
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

var fs = require('fs');
var os = require('os');
var path = require('path');

var api = require('./api.js');
var authorizationUtil = require('./authorization-util.js');
var config = require('../../config/config.js');
var db = require('./db.js');
var i18n = require('./i18n.js');
var mixpanel = require('./mixpanel.js');
var popup = require('../views/popups/popup.js');

var MainPage = require('../views/main-page/main-page.js');

function appWindowBindings() {
  uiGlobals.on(uiGlobals.Event.SignIn, function() {
    rebuildMenuBar(true);
  });

  // This code redirects links in app description/changelog
  // markdown to open in the default browser, instead of
  // trying to open in node-webkit.
  $('body').on('click', 'a', function(evt) {
    evt.preventDefault();
    var href = $(this).attr('href');
    if (href) {
      nwGui.Shell.openExternal(href);
    }
  });

  nwGui.Window.get().on('close', function() {
    this.hide();
    this.close(true);
    process.exit();
  });

  process.on('exit', mixpanel.trackClose);
}

var PlatformControlPanelPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\LeapControlPanel.exe'
};


function maximizeWindow() {
  var win = nwGui.Window.get();
  win.show();
  win.maximize();
  win.setAlwaysOnTop(true);
  win.setAlwaysOnTop(false);
}

function paintMainPage() {
  if (uiGlobals.mainPageView) {
    console.info('Redrawing main app');
    uiGlobals.mainPageView.$el.remove();
  }
  uiGlobals.mainPageView = new MainPage();
  $('body').append(uiGlobals.mainPageView.$el);
}

function rebuildMenuBar(enableLogOut) {
  var mainMenu = new nwGui.Menu({ type: 'menubar' });

  if (os.platform() === 'win32') {
    var fileMenu = new nwGui.Menu();
    fileMenu.append(new nwGui.MenuItem({
      label: i18n.translate('Controller Settings'),
      click: function() {
        nwGui.Shell.openItem(PlatformControlPanelPaths.win32);
      }
    }));
    fileMenu.append(new nwGui.MenuItem({
      label: i18n.translate('Exit'),
      click: function() {
        nwGui.Window.get().emit('close');
      }
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: i18n.translate('File'),
      submenu: fileMenu
    }));
  }

  var accountMenu = new nwGui.Menu();
  accountMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Sign out %1$s').fetch(enableLogOut ? (uiGlobals.username || uiGlobals.email) : ''),
    click: authorizationUtil.logOutUser,
    enabled: !!enableLogOut
  }));
  accountMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Set install directory...'),
    click: function() {
      $('input#installLocation').trigger('click');
    }
  }));
  mainMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Account'),
    submenu: accountMenu
  }));

  $('input#installLocation').change(function() {
    var newAppDir = $(this).val();

    uiGlobals.myApps.filter(function(app) {
      return app.isStoreApp();
    }).forEach(function(app) {
      app.move(newAppDir);
    });

    console.log('Changed app install location to ' + newAppDir);
    db.saveObj(config.DbKeys.AppInstallDir, newAppDir);
    $('input#installLocation').attr('nwdirectory', newAppDir);
  });

  // TODO: support website links on both OS X and Windows
  if (os.platform() === 'win32') {
    var helpMenu = new nwGui.Menu();
    helpMenu.append(new nwGui.MenuItem({
      label: 'Getting Started...',
      click: function() {
        nwGui.Shell.openExternal(config.GettingStartedUrl);
      }
    }));
    helpMenu.append(new nwGui.MenuItem({
      label: i18n.translate('About Airspace Home'),
      click: function() {
        popup.open('about');
      }
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: i18n.translate('Help'),
      submenu: helpMenu
    }));
  }

  nwGui.Window.get().menu = mainMenu;
}

appWindowBindings();
module.exports.maximizeWindow = maximizeWindow;
module.exports.rebuildMenuBar = rebuildMenuBar;
module.exports.paintMainPage = paintMainPage;



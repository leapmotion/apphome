var os = require('os');

var api = require('./api.js');
var MainPage = require('../views/main-page/main-page.js');
var authorizationUtil = require('./authorization-util.js');
var mixpanel = require('./mixpanel.js');
var popup = require('../views/popups/popup.js');
var config = require('../../config/config.js');


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
      label: uiGlobals.i18n.translate('Controller Settings').fetch(),
      click: function() {
        nwGui.Shell.openItem(PlatformControlPanelPaths.win32);
      }
    }));
    fileMenu.append(new nwGui.MenuItem({
      label: uiGlobals.i18n.translate('Exit').fetch(),
      click: function() {
        nwGui.Window.get().emit('close');
      }
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: uiGlobals.i18n.translate('File').fetch(),
      submenu: fileMenu
    }));
  }

  var accountMenu = new nwGui.Menu();
  accountMenu.append(new nwGui.MenuItem({
    label: uiGlobals.i18n.translate('Sign out %1$s').fetch(enableLogOut ? (uiGlobals.username || uiGlobals.email) : ''),
    click: authorizationUtil.logOutUser,
    enabled: !!enableLogOut
  }));
  mainMenu.append(new nwGui.MenuItem({
    label: uiGlobals.i18n.translate('Account').fetch(),
    submenu: accountMenu
  }));

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
      label: uiGlobals.i18n.translate('About Airspace Home').fetch(),
      click: function() {
        popup.open('about');
      }
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: uiGlobals.i18n.translate('Help').fetch(),
      submenu: helpMenu
    }));
  }

  nwGui.Window.get().menu = mainMenu;
}

appWindowBindings();
module.exports.maximizeWindow = maximizeWindow;
module.exports.rebuildMenuBar = rebuildMenuBar;
module.exports.paintMainPage = paintMainPage;



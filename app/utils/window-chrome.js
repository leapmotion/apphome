var os = require('os');

var api = require('./api.js');
var MainPage = require('../views/main-page/main-page.js');
var authorization = require('./authorization.js');

uiGlobals.on(uiGlobals.Event.SignIn, function() {
  rebuildMenuBar(true);
});

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
      label: 'Controller Settings',
      click: function() {
        nwGui.Shell.openItem(PlatformControlPanelPaths.win32);
      }
    }));
    fileMenu.append(new nwGui.MenuItem({
      label: 'Exit',
      click: function() {
        window.close();
      }
    }));
    mainMenu.append(new nwGui.MenuItem({
      label: 'File',
      submenu: fileMenu
    }));
  }

  var accountMenu = new nwGui.Menu();
  accountMenu.append(new nwGui.MenuItem({
    label: 'Sign Out' + (enableLogOut ? ' ' + (uiGlobals.username || uiGlobals.email) : ''),
    click: authorization.logOutUser,
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
}


module.exports.maximizeWindow = maximizeWindow;
module.exports.rebuildMenuBar = rebuildMenuBar;
module.exports.paintMainPage = paintMainPage;



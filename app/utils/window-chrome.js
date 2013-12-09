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
var tutorial = require('./tutorial.js');

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
  win.maximize();
  win.show();
  win.focus();
}

function paintMainPage() {
  if (uiGlobals.mainPageView) {
    console.info('Redrawing main app');
    uiGlobals.mainPageView.$el.remove();
  }
  uiGlobals.mainPageView = new MainPage();
  $('body').append(uiGlobals.mainPageView.$el);
}

function rebuildMenuBar(enableLogOut, disableSetInstallDir) {
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
    label: i18n.translate('Sign Out %1$s').fetch(enableLogOut ? (uiGlobals.username || uiGlobals.email) : ''),
    click: authorizationUtil.logOutUser,
    enabled: !!enableLogOut
  }));
  accountMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Set Install Directory...'),
    click: function() {
      $('input#installLocation').trigger('click');
    },
    enabled: !disableSetInstallDir
  }));
  mainMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Account'),
    submenu: accountMenu
  }));


  // Build from source because node webkit's implementation of the file picker
  // doesn't actually accept changes to the nwworkingdir attribute
  var createFileInput = function(defaultDir) {
    $('input#installLocation').remove();

    $fileInput = $('<input>').attr({
      id: 'installLocation',
      type: 'file',
      nwdirectory: true,
      nwworkingdir: defaultDir,
      style: 'display:none;',
    });

    $fileInput.appendTo('body');
  };

  if (!disableSetInstallDir) {
    var nwworkingdir = db.fetchObj(config.DbKeys.AppInstallDir) || path.join.apply(null, config.PlatformAppDirs[os.platform()]);
    console.log('Current install directory: ' + nwworkingdir);
    createFileInput(nwworkingdir);
  }

  $('input#installLocation').change(function() {
    if (!$(this).val()) {
      console.log("Reported a blank new install location.  Not moving anything.");
      return;
    }

    console.log($(this).val());
    var installLocationInput = $('input#installLocation');
    installLocationInput.remove();

    rebuildMenuBar(true, true);
    var newAppDir = $(this).val();

    console.log('Changing app install location to ' + newAppDir);
    db.saveObj(config.DbKeys.AppInstallDir, newAppDir);

    uiGlobals.myApps.move(newAppDir, function() {
      console.log('~~~~~~~~~~~~~ MOVE COMPLETE ~~~~~~~~~~~~~~');
      rebuildMenuBar(true);
    });
  });

  var helpMenu = new nwGui.Menu();
  helpMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Getting Started...'),
    click: function() {
      nwGui.Shell.openExternal(config.GettingStartedUrl);
    }
  }));
  helpMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Launch Tutorial...'),
    click: function() {
      tutorial.start();
    },
    enabled: !!enableLogOut // Only launch tutorial once apps have rendered
  }));
  helpMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Community Forums...'),
    click: function() {
      nwGui.Shell.openExternal(config.CommunityForumsUrl);
    }
  }));
  helpMenu.append(new nwGui.MenuItem({
    label: i18n.translate('Get Support...'),
    click: function() {
      nwGui.Shell.openExternal(config.GetSupportUrl);
    }
  }));
  helpMenu.append(new nwGui.MenuItem({
    label: i18n.translate('About Airspace Home'),
    click: function() {
      popup.open('about');
    }
  }));

  var helpMenuItem = new nwGui.MenuItem({
    label: i18n.translate('Help'),
    submenu: helpMenu
  });

  // Need to do this first on windows for it to show up.  Not entirely sure why.
  if (os.platform() === 'win32') {
    mainMenu.append(helpMenuItem);
  }

  // This command populates Edit and Window into the menubar.
  nwGui.Window.get().menu = mainMenu;

  // Need to do this after on mac, so 'Help' shows up after 'Window'
  if (os.platform() === 'darwin') {
    mainMenu.append(helpMenuItem);
  }

}

appWindowBindings();
module.exports.maximizeWindow = maximizeWindow;
module.exports.rebuildMenuBar = rebuildMenuBar;
module.exports.paintMainPage = paintMainPage;



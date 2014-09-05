// Generated by CoffeeScript 1.7.1
(function() {
  var LabModalView, MainPage, api, appWindowBindings, authorizationUtil, buildAccountMenu, buildFileMenu, buildHelpMenu, config, db, execFile, fs, ga, i18n, maximizeWindow, oauth, os, paintMainPage, path, popup, qs, rebuildMenuBar, tutorial;

  fs = require("fs");

  os = require("os");

  path = require("path");

  execFile = require('child_process').execFile;

  api = require("./api.js");

  authorizationUtil = require("./authorization-util.js");

  config = require("../../config/config.js");

  db = require("./db.js");

  i18n = require("./i18n.js");

  ga = require("./ga.js");

  qs = require("querystring");

  oauth = require("./oauth.js");

  popup = require("../views/popups/popup.js");

  tutorial = require("./tutorial.js");

  MainPage = require("../views/main-page/main-page.js");

  LabModalView = require('../views/lab-modal/lab-modal.js');

  appWindowBindings = function() {
    uiGlobals.on(uiGlobals.Event.SignIn, function() {
      return rebuildMenuBar(true);
    });
    $("body").on("click", "a", function(evt) {
      var href;
      evt.preventDefault();
      href = $(this).attr("href");
      if (href) {
        return nwGui.Shell.openExternal(href);
      }
    });
    nwGui.Window.get().on("close", function() {
      this.hide();
      this.close(true);
      return process.exit();
    });
    return process.on("exit", ga.trackClose);
  };

  maximizeWindow = function() {
    var win;
    win = nwGui.Window.get();
    win.maximize();
    win.show();
    return win.focus();
  };

  paintMainPage = function() {
    if (uiGlobals.mainPageView) {
      console.info("Redrawing main app");
      uiGlobals.mainPageView.$el.remove();
    }
    uiGlobals.mainPageView = new MainPage();
    return $("body").append(uiGlobals.mainPageView.$el);
  };

  buildFileMenu = function() {
    var fileMenu;
    fileMenu = new nwGui.Menu();
    fileMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Controller Settings"),
      click: function() {
        return execFile(config.PlatformControlPanelPaths[os.platform()], ['--showsettings']);
      }
    }));
    fileMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Exit"),
      click: function() {
        return nwGui.Window.get().emit("close");
      }
    }));
    return new nwGui.MenuItem({
      label: i18n.translate("File"),
      submenu: fileMenu
    });
  };

  buildAccountMenu = function(enableLogOut, disableSetInstallDir) {
    var accountMenu;
    accountMenu = new nwGui.Menu();
    if (uiGlobals.is_ghost) {
      accountMenu.append(new nwGui.MenuItem({
        label: i18n.translate("Sign Up"),
        click: function() {
          return oauth.getAccessToken(function(err, accessToken) {
            var urlToLaunch;
            if (!err) {
              urlToLaunch = config.oauth.sign_up_url + '?' + qs.stringify({
                access_token: accessToken,
                _r: config.AirspaceURL + '?sign_up=true'
              });
              return nwGui.Shell.openExternal(urlToLaunch);
            }
          });
        },
        enabled: !!enableLogOut
      }));
    } else {
      accountMenu.append(new nwGui.MenuItem({
        label: i18n.translate("Sign Out %1$s").fetch((enableLogOut ? uiGlobals.display_name : "")),
        click: authorizationUtil.logOutUser,
        enabled: !!enableLogOut
      }));
    }
    accountMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Set Install Directory..."),
      click: function() {
        return $("input#installLocation").trigger("click");
      },
      enabled: !disableSetInstallDir
    }));
    if (_.keys(uiGlobals.labOptions).length) {
      accountMenu.append(new nwGui.MenuItem({
        label: i18n.translate('Labs'),
        click: function() {
          return (new LabModalView()).show();
        }
      }));
    }
    return new nwGui.MenuItem({
      label: i18n.translate("Account"),
      submenu: accountMenu
    });
  };

  buildHelpMenu = function(enableLogOut) {
    var helpMenu;
    helpMenu = new nwGui.Menu();
    helpMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Getting Started..."),
      click: function() {
        return nwGui.Shell.openExternal(config.GettingStartedUrl);
      }
    }));
    helpMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Launch Tutorial..."),
      click: function() {
        return tutorial.start();
      },
      enabled: !!enableLogOut
    }));
    helpMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Community Forums..."),
      click: function() {
        return nwGui.Shell.openExternal(config.CommunityForumsUrl);
      }
    }));
    helpMenu.append(new nwGui.MenuItem({
      label: i18n.translate("Get Support..."),
      click: function() {
        return nwGui.Shell.openExternal(config.GetSupportUrl);
      }
    }));
    if (os.platform() === "win32") {
      helpMenu.append(new nwGui.MenuItem({
        label: i18n.translate("About Leap Motion App Home"),
        click: function() {
          return popup.open("about");
        }
      }));
    } else {
      helpMenu.append(new nwGui.MenuItem({
        label: i18n.translate("Controller Settings"),
        click: function() {
          return nwGui.Shell.openItem(config.PlatformControlPanelPaths[os.platform()]);
        }
      }));
    }
    return new nwGui.MenuItem({
      label: i18n.translate("Help"),
      submenu: helpMenu
    });
  };

  rebuildMenuBar = function(enableLogOut, disableSetInstallDir) {
    var createFileInput, helpMenuItem, mainMenu, nwworkingdir;
    mainMenu = new nwGui.Menu({
      type: "menubar"
    });
    if (os.platform() === "win32") {
      mainMenu.append(buildFileMenu());
    }
    mainMenu.append(buildAccountMenu(enableLogOut, disableSetInstallDir));
    createFileInput = function(defaultDir) {
      var $fileInput;
      $("input#installLocation").remove();
      $fileInput = $("<input>").attr({
        id: "installLocation",
        type: "file",
        nwdirectory: true,
        nwworkingdir: defaultDir,
        style: "display:none;"
      });
      return $fileInput.appendTo("body");
    };
    if (!disableSetInstallDir) {
      nwworkingdir = db.fetchObj(config.DbKeys.AppInstallDir) || path.join.apply(null, config.PlatformAppDirs[os.platform()]);
      console.log("Current install directory: " + nwworkingdir);
      createFileInput(nwworkingdir);
    }
    $("input#installLocation").change(function() {
      var installLocationInput, newAppDir;
      newAppDir = $(this).val();
      if (!newAppDir) {
        console.log("Reported a blank new install location.  Not moving anything.");
        return;
      }
      installLocationInput = $("input#installLocation");
      installLocationInput.remove();
      rebuildMenuBar(enableLogOut, true);
      console.log("Changing app install location to " + newAppDir);
      db.saveObj(config.DbKeys.AppInstallDir, newAppDir);
      return uiGlobals.myApps.move(newAppDir, function() {
        console.log("~~~~~~~~~~~~~ MOVE COMPLETE ~~~~~~~~~~~~~~");
        return rebuildMenuBar(enableLogOut, false);
      });
    });
    helpMenuItem = buildHelpMenu(enableLogOut);
    if (os.platform() === 'win32') {
      mainMenu.append(helpMenuItem);
    }
    nwGui.Window.get().menu = mainMenu;
    if (os.platform() === 'darwin') {
      return mainMenu.append(helpMenuItem);
    }
  };

  appWindowBindings();

  module.exports.maximizeWindow = maximizeWindow;

  module.exports.rebuildMenuBar = rebuildMenuBar;

  module.exports.paintMainPage = paintMainPage;

}).call(this);

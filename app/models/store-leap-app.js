var async = require('async');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');

var config = require('../../config/config.js');
var download = require('../utils/download.js');
var extract = require('../utils/extract.js');
var plist = require('../utils/plist.js');
var shell = require('../utils/shell.js');

var LeapApp = require('./leap-app.js');

var AppsDir = 'AirspaceApps';
var PlatformAppDirs = {
  win32:  [ process.env.LOCALAPPDATA || process.env.USERPROFILE, AppsDir ],
  darwin: [ process.env.HOME, 'Applications', AppsDir ],
  linux:  [ process.env.HOME, AppsDir ]
};

var AppsUserDataDir = 'AirspaceApps';
var PlatformUserDataDirs = {
  win32:  [ process.env.APPDATA, AppsUserDataDir ],
  darwin: [ process.env.HOME, 'Library', 'Application Support', AppsUserDataDir ],
  linux:  [ process.env.HOME, '.config', AppsUserDataDir ]
};

module.exports = LeapApp.extend({

  initialize: function() {
    if (!this.get('iconPath')) {
      this._downloadIcon();
    }

    if (!this.get('tilePath')) {
      this._downloadTile();
    }

    LeapApp.prototype.initialize.apply(this, arguments);
  },

  _downloadIcon: function(cb) {
    var iconUrl = this.get('iconUrl');
    download.getWithFallback(iconUrl, this.standardIconPath(), config.Defaults.IconPath, function(err, iconPathOrFallback) {
      this.set('iconPath', iconPathOrFallback);
      cb && cb(null);
    }.bind(this));
  },

  _downloadTile: function(cb) {
    var tileUrl = this.get('tileUrl');
    download.getWithFallback(tileUrl, this.standardTilePath(), config.Defaults.TilePath, function(err, tilePathOrFallback) {
      this.set('tilePath', tilePathOrFallback);
      cb && cb(null);
    }.bind(this));
  },

  isStoreApp: function() {
    return true;
  },

  install: function(cb) {
    if (this.isUpgrade()) {
      this._installAsUpgrade(cb);
    } else {
      this._installFromServer(cb);
    }
  },

  _installAsUpgrade: function(cb) {
    var appToUpgrade = this.findAppToUpgrade();
    var errorMessage = 'Failed to upgrade app: ' + this.get('name') + ' from v.' + appToUpgrade.get('version') + ' to v.' + this.get('version');
    if (appToUpgrade && appToUpgrade.isUninstallable()) {
      appToUpgrade.uninstall(true, false, function(err) {
        if (!err) {
          uiGlobals.installedApps.remove(appToUpgrade);
          this._installFromServer(function(err) {
            if (err) {
              console.error(errorMessage);
            }
            cb && cb(err);
          }.bind(this));
        } else {
          console.error(errorMessage);
          cb && cb(err);
        }
      }.bind(this));
    }
  },

  _installFromServer: function(cb) {
    var startingCollection = (uiGlobals.uninstalledApps.get(this.get('id')) ? uiGlobals.uninstalledApps : uiGlobals.availableDownloads);
    startingCollection.remove(this);
    uiGlobals.installedApps.add(this);

    var downloadProgress = this._downloadBinary(function(err) {
      if (err) {
        this._abortInstallation(startingCollection, err);
        return cb && cb(err);
      }
      var dependenciesReadmePath = path.join(this._appDir(), 'Dependencies', 'README.html');
      if (fs.existsSync(dependenciesReadmePath)) {
        nwGui.Shell.openExternal('file://' + dependenciesReadmePath);
      }
      var executable;
      if (os.platform() === 'win32') {
        executable = path.join(this._appDir(), this.get('name') + '_LM.exe');
      } else {
        executable = this._appDir();
      }
      this.set('executable', executable);
      this.set('state', LeapApp.States.Ready);
      cb && cb(null);
    }.bind(this));

    downloadProgress.on('progress', function(progress) {
      this.trigger('progress', progress);
    }.bind(this));
  },

  _abortInstallation: function(previousCollection, err) {
    console.warn('Installation failed:', err.stack);
    uiGlobals.installedApps.remove(this);
    this.set('state', LeapApp.States.NotYetInstalled);
    previousCollection.add(this);
  },

  _downloadBinary: function(cb) {
    var binaryUrl = this.get('binaryUrl');
    this.set('state', LeapApp.States.Downloading);
    return download.get(binaryUrl, function(err, tempFilename) {
      if (err) {
        return cb(err);
      }
      this.set('state', LeapApp.States.Installing);
      if (os.platform() === 'win32') {
        extract.unzip(tempFilename, this._appDir(), cb);
      } else if (os.platform() === 'darwin') {
        extract.undmg(tempFilename, this._appDir(), cb);
      } else {
        return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
    }.bind(this));
  },

  uninstall: function(deleteIconAndTile, deleteUserData, cb) {
    this.set('state', LeapApp.States.Uninstalling);

    try {
      fs.removeSync(this._appDir());
    } catch(err) {
      this.set('state', LeapApp.States.Ready);
      console.warn("Can't uninstall, app is probably running.");
      return;
    }

    try {
      if (deleteUserData) {
        fs.removeSync(this._userDataDir());
      }

      if (deleteIconAndTile) {
        fs.removeSync(this.standardIconPath());
        fs.removeSync(this.standardTilePath());
      }
      return cb && cb(null);
    } catch (err) {
      console.warn('Failed to uninstall app:', err.stack);
      return cb && cb(err);
    } finally {
      uiGlobals.installedApps.remove(this);
      uiGlobals.uninstalledApps.add(this);
      this.set('installedAt', null);
      this.set('state', LeapApp.States.Uninstalled);
    }
  },

  _appDir: function() {
    var dir = this._getDir(PlatformAppDirs, '__appDir');
    if (os.platform() === 'darwin') {
      dir = dir + '.app';
    }
    return dir;
  },

  _userDataDir: function() {
    return this._getDir(PlatformUserDataDirs, '__userDataDir');
  },

  _getDir: function(dirsByPlatform, attributeName) {
    var dir = this[attributeName];
    if (!dir) {
      if (!dirsByPlatform[os.platform()]) {
        throw new Error('Unknown operating system: ' + os.platform());
      }
      if (!this.get('name')) {
        throw new Error('No app name specified.');
      }
      var baseDir = path.join.apply(path, dirsByPlatform[os.platform()]);
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir);
      }
      dir = path.join(baseDir, this.get('name'));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      this[attributeName] = dir;
    }
    return dir;
  }

});

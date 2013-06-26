var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');

var api = require('../utils/api.js');
var config = require('../../config/config.js');
var download = require('../utils/download.js');
var extract = require('../utils/extract.js');
var mixpanel = require('../utils/mixpanel.js');
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

  isStoreApp: function() {
    return true;
  },

  install: function(cb) {
    this.trigger('installstart');
    console.log('Installing: ' + this.get('name'));
    if (this.isUpgrade()) {
      this._installAsUpgrade(cb);
    } else {
      this._installFromServer(cb);
    }
  },

  _installAsUpgrade: function(cb) {
    var trackFn = mixpanel.getTrackFn('Started App Update');
    trackFn();

    var appToUpgrade = this.findAppToUpgrade();
    if (appToUpgrade && appToUpgrade.isUninstallable()) {
      appToUpgrade.uninstall(false, false, function(err) {
        if (!err) {
          this._installFromServer(function(err2) {
            if (err2) {
              appToUpgrade._installFromServer(function(err3) {
                cb(err3 || err2);
              });
            } else {
              uiGlobals.uninstalledApps.remove(appToUpgrade);
              this.save();
              cb(null);
            }
          }.bind(this));
        } else {
          this._abortInstallation(null, err);
          cb && cb(err);
        }
      }.bind(this));
    } else {
      this._installFromServer(cb);
    }
  },

  _installFromServer: function(cb) {
    var startingCollection = (uiGlobals.uninstalledApps.get(this.get('id')) ? uiGlobals.uninstalledApps : uiGlobals.availableDownloads);
    startingCollection.remove(this);
    uiGlobals.installedApps.add(this);

    this._downloadBinary(function(err) {
      if (err) {
        this._abortInstallation(startingCollection, err);
        return cb && cb(err);
      }
      var dependenciesReadmePath = path.join(this._appDir(), 'Dependencies', 'README.html');
      if (fs.existsSync(dependenciesReadmePath)) {
        nwGui.Shell.openExternal('file://' + dependenciesReadmePath);
      }

      var userDataDir = this._userDataDir();
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir);
      }

      var executable = this._findExecutable();
      if (executable) {
        this.set('executable', executable);
        uiGlobals.sendNotification('Done installing ' + this.get('name'), 'to the Airspace launcher.');
        this.set('state', LeapApp.States.Ready);
        return cb && cb(null);
      } else {
        var exeNotFoundError = new Error('Could not find executable for app: ' + this.get('name'));
        this._abortInstallation(startingCollection, exeNotFoundError);
        return cb && cb(exeNotFoundError);
      }
    }.bind(this));
  },

  _abortInstallation: function(previousCollection, err) {
    console.warn('Installation of ' + this.get('name') + ' failed: ' + (err.stack || err));
    uiGlobals.installedApps.remove(this);
    this.set('state', LeapApp.States.NotYetInstalled);
    if (previousCollection) {
      previousCollection.add(this);
    }
    uiGlobals.sendNotification('Installation of ' + this.get('name') + ' failed.', 'Try again in a few moments.');
  },

  _downloadBinary: function(cb) {
    this.set('state', LeapApp.States.Downloading);
    uiGlobals.sendNotification('Downloading ' + this.get('name'), 'to the Airspace launcher.');
    api.connectToStoreServer(true, function() {
      var binaryUrl = this.get('binaryUrl');
      var downloadProgress = download.get(binaryUrl, function(err, tempFilename) {
        if (err) {
          return cb(err);
        }
        uiGlobals.sendNotification('Installing ' + this.get('name'), 'to the Airspace launcher.');
        this.set('state', LeapApp.States.Installing);
        console.debug('Downloaded ' + this.get('name') + ' to ' + tempFilename);
        function cleanupTempfile(err) {
          if (fs.existsSync(tempFilename)) {
            fs.deleteSync(tempFilename);
          }
          cb(err || null);
        }
        if (os.platform() === 'win32') {
          extract.unzip(tempFilename, this._appDir(), cleanupTempfile);
        } else if (os.platform() === 'darwin') {
          extract.undmg(tempFilename, this._appDir(), cleanupTempfile);
        } else {
          return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
        }
      }.bind(this));

      downloadProgress.on('progress', function(progress) {
        this.trigger('progress', progress);
      }.bind(this));
    }.bind(this));
  },

  uninstall: function(deleteIconAndTile, deleteUserData, cb) {
    this.set('state', LeapApp.States.Uninstalling);
    console.log('Uninstalling: ' + this.get('name'));
    try {
      fs.removeSync(this._appDir());
    } catch(err) {
      if (err.code === 'EACCES' && os.platform() === 'darwin') {
        // if permissions are broken on OS X, try to fix them
        exec('chmod -R +w ' + shell.escape(this._appDir()), function(err) {
          if (err) {
            return this._failUninstallation(err, cb);
          } else {
            try {
              fs.removeSync(this._appDir());
            } catch(err2) {
              return this._failUninstallation(err2, cb);
            }
            this._finishUninstallation(deleteIconAndTile, deleteUserData, cb);
          }
        }.bind(this));
        return;
      } else {
        return this._failUninstallation(err, cb);
      }
    }

    this._finishUninstallation(deleteIconAndTile, deleteUserData, cb);
  },

  _failUninstallation: function(err, cb) {
    this.set('state', LeapApp.States.Ready);
    console.warn("Can't uninstall app: " + ((err && err.stack) || err));
    cb && cb(err2);
  },

  _finishUninstallation: function(deleteIconAndTile, deleteUserData, cb) {
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
      return this._failUninstallation(err, cb);
    } finally {
      uiGlobals.installedApps.remove(this);
      uiGlobals.uninstalledApps.add(this);
      this.set('installedAt', null);
      this.set('state', LeapApp.States.Uninstalled);
    }
  },

  _appDir: function() {
    var suffix = (os.platform() === 'darwin' ? '.app' : '');
    return this._getDir(PlatformAppDirs, '__appDir', suffix);
  },

  _userDataDir: function() {
    return this._getDir(PlatformUserDataDirs, '__userDataDir');
  },

  _getDir: function(dirsByPlatform, attributeName, suffix) {
    suffix = suffix || '';
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
      dir = path.join(baseDir, this.cleanAppName() + suffix);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      this[attributeName] = dir;
    }
    return dir;
  },

  _findExecutable: function() {
    var executable;

    if (os.platform() === 'win32') {
      executable = path.join(this._appDir(), this.cleanAppName() + '_LM.exe');
      if (!fs.existsSync(executable)) {
        var foundExecutable = false;
        var appFiles = fs.readdirSync(this._appDir());
        for (var i = 0, len = appFiles.length; i < len; i++) {
          if (/_lm\.exe$/i.test(appFiles[i])) {
            if (foundExecutable) { // multiple exe files in directory
              return null;
            } else {
              foundExecutable = true;
              executable = path.join(this._appDir(), appFiles[i]);
            }
          }
        }
      }
    } else {
      executable = this._appDir();
    }

    return executable;
  }

});

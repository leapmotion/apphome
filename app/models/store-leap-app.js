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
var url = require('url');

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

  idAttribute: 'appId',

  isStoreApp: function() {
    return true;
  },

  install: function(cb) {
    this.trigger('installstart');
    if (this.isUpgradable()) {
      mixpanel.trackAppUpgrade();
      this.set(this.get('availableUpgrade'));
      console.log('Upgrading: ' + this.get('name'));
      this._installFromServer(function(err) {
        if (!err) {
          this.set('availableUpgrade', null);
        }
        cb && cb(err);
      })
    } else {
      console.log('Installing: ' + this.get('name'));
      this._installFromServer(cb);
    }
  },

  _installFromServer: function(cb) {
    async.series([
      this._downloadBinary.bind(this),
      this._configureBinary.bind(this),
      this._authenticateBinary.bind(this)
    ], function(err) {
      this._installationComplete(err, cb);
    }.bind(this));
  },

  _installationComplete: function(err, cb) {
    if (err) {
      if (err.cancelled) {
        console.info('Installation of ' + this.get('name') + ' was cancelled.');
      } else {
        console.warn('Installation of ' + this.get('name') + ' failed: ' + (err.stack || err));
      }
      this.set('state', LeapApp.States.NotYetInstalled);
    } else {
      console.info('Installation of ' + this.get('name') + ' complete');
      this.set('state', LeapApp.States.Ready);
    }
    cb && cb(err);
  },

  _downloadBinary: function(cb) {
    console.info('Downloading binary of ' + this.get('name'));
    this.set('state', LeapApp.States.Connecting);
    var binaryUrl = this.get('binaryUrl');
    console.log('checking for a local binary', binaryUrl, url.parse(binaryUrl).protocol);

    var tempFilename;
    var cleanupTempfileAndContinue = function(err) {
      if (tempFilename && fs.existsSync(tempFilename)) {
        try {
          fs.deleteSync(tempFilename);
        } catch (e) {
          err = e;
        }
      }
      cb && cb(err || null);
    };


    if (url.parse(binaryUrl).protocol == null) {
      var tempFilename = './tmp/' + binaryUrl;
      console.log('local binary detected, installing from ', tempFilename);
      if (os.platform() === 'win32') {
        extract.unzip(tempFilename, this._appDir(), cleanupTempfileAndContinue);
      } else if (os.platform() === 'darwin') {
        extract.undmg(tempFilename, this._appDir(), cleanupTempfileAndContinue);
      } else {
        return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
      cb && cb(null);
      return;
    }
    api.connectToStoreServer(true, function(err) {
      if (err) {
        return cb(err);
      }
      var downloadProgress = download.get(binaryUrl, function(err, tempFilename) {
        if (err) {
          return cb(err);
        }
        this.set('state', LeapApp.States.Installing);
        console.debug('Downloaded ' + this.get('name') + ' to ' + tempFilename);

        if (os.platform() === 'win32') {
          extract.unzip(tempFilename, this._appDir(), cleanupTempfileAndContinue);
        } else if (os.platform() === 'darwin') {
          extract.undmg(tempFilename, this._appDir(), cleanupTempfileAndContinue);
        } else {
          return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
        }
      }.bind(this));

      function cancelDownload() {
        if (downloadProgress) {
          var cancelled = downloadProgress.cancel();
          if (cancelled) {
            downloadProgress = null;
            this.set('noAutoInstall', true);
            this.off('cancel-download', cancelDownload);
          }
        } else {
          this.off('cancel-download', cancelDownload);
        }
      }

      this.on('cancel-download', cancelDownload, this);

      downloadProgress.on('progress', function(progress) {
        this.set('state', LeapApp.States.Downloading);
        this.trigger('progress', progress);
      }.bind(this));
    }.bind(this));
  },

  _configureBinary: function(cb) {
    console.info('Configuring binary of ' + this.get('name'));
    var dependenciesReadmePath = path.join(this._appDir(), 'Dependencies', 'README.html');
    if (fs.existsSync(dependenciesReadmePath)) {
      nwGui.Shell.openExternal('file://' + dependenciesReadmePath);
    }

    var userDataDir = this._userDataDir();
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirpSync(userDataDir);
    }
    var err = null;
    var executable = this._findExecutable();
    if (executable) {
      this.set('executable', executable);
    } else {
      err = new Error('Could not find executable for app: ' + this.get('name'));
    }
    cb && cb(err);
  },

  _authenticateBinary: function(cb) {
    // TODO:
//    console.info('Authenticating binary of ' + this.get('name'));
//    if (os.platform() === 'win32') {
//      console.log('tmp - app dir: ' + this._appDir());
//    }
    cb && cb(null);
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
      dir = path.join(baseDir, this.cleanAppName() + suffix);
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

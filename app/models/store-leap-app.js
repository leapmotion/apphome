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

  initialize: function() {
    if (!this.get('gotDetails')) {
      api.refreshAppDetails(this, function() {
        this.save();
      }.bind(this));
    }
    LeapApp.prototype.initialize.apply(this, arguments);
  },

  isStoreApp: function() {
    return true;
  },

  install: function(cb) {
    this.trigger('installstart');
    if (this.isUpgradable()) {
      mixpanel.trackAppUpgrade();
      this.set(this.get('availableUpgrade').toJSON());
      console.log('Upgrading: ' + this.get('name'));
      this._installFromServer(function(err) {
        if (!err) {
          this.set('availableUpgrade', null);
        }
        cb && cb(err);
      }.bind(this));
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

  _downloadBinary: function(cb) {
    console.info('Downloading binary of ' + this.get('name'));
    this.set('state', LeapApp.States.Connecting);
    var binaryUrl = this.get('binaryUrl');
    if (url.parse(binaryUrl).protocol == null) { // freeze-dried local file
      var tempFilename = path.join(config.PlatformTempDirs[os.platform()], 'frozen', binaryUrl);
      console.log('Local binary detected. Extracting ' + tempFilename + ' to ' + this._appDir());
      if (os.platform() === 'win32') {
        extract.unzip(tempFilename, this._appDir(), function(err) {
          this._cleanupTempfile(tempFilename, err, cb);
        }.bind(this));
      } else if (os.platform() === 'darwin') {
        extract.undmg(tempFilename, this._appDir(), function(err) {
          this._cleanupTempfile(tempFilename, err, cb);
        }.bind(this));
      } else {
        cb && cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
    } else { // install from server
      api.refreshAppDetails(this, function(err) {
        if (err) {
          return cb(err);
        }
        binaryUrl = this.get('binaryUrl'); // refreshed binary URL
        var downloadProgress = download.get(binaryUrl, function(err, tempFilename) {
          if (err) {
            return this._cleanupTempfile(err, tempFilename, cb);
          }
          this.set('state', LeapApp.States.Installing);
          console.debug('Downloaded ' + this.get('name') + ' to ' + tempFilename);

          if (os.platform() === 'win32') {
            extract.unzip(tempFilename, this._appDir(), function(err) {
              this._cleanupTempfile(err, tempFilename, cb);
            }.bind(this));
          } else if (os.platform() === 'darwin') {
            extract.undmg(tempFilename, this._appDir(), function(err) {
              this._cleanupTempfile(err, tempFilename, cb);
            }.bind(this));
          } else {
            return cb && cb(new Error("Don't know how to install apps on platform: " + os.platform()));
          }
        }.bind(this));

        function cancelDownload() {
          if (downloadProgress) {
            var cancelled = downloadProgress.cancel();
            if (cancelled) {
              downloadProgress = null;
              this.set('noAutoInstall', true);
              this.off('cancel-download', cancelDownload);
              this.set('state', LeapApp.Stores.NotYetInstalled);
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
    }
  },

  _configureBinary: function(cb) {
    console.info('Configuring binary of ' + this.get('name'));
    try {
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
    } catch (e) {
      err = e;
      console.error('StoreLeapApp#_configureBinary. Unknown failure. ' + (err.stack || err));
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

  _installationComplete: function(err, cb) {
    if (err) {
      if (err.cancelled) {
        console.info('Installation of ' + this.get('name') + ' was cancelled.');
      } else {
        console.warn('Installation of ' + this.get('name') + ' failed: ' + (err.stack || err));
      }
      this.set('state', LeapApp.States.NotYetInstalled);
      mixpanel.trackEvent('Install Failed', { appName: this.get('name'), appVersion: this.get('version'), error: err && err.stack });
    } else {
      console.info('Installation of ' + this.get('name') + ' complete');
      this.set('state', LeapApp.States.Ready);
      this.trigger('installend');
    }
    cb && cb(err);
  },

  _cleanupTempfile: function(err, tempFilename, cb) {
    try {
      if (tempFilename && fs.existsSync(tempFilename)) {
        fs.deleteSync(tempFilename);
      }
    } catch (e) {
      console.error('Failed to cleanup StoreLeapApp temp binary. ' + (e.stack || e));
    }
    return cb && cb(err || null);
  },

  uninstall: function(deleteIconAndTile, deleteUserData, cb) {
    this.trigger('uninstallstart');
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
              console.error('Failed to uninstall StoreLeapApp binary ' + (err.stack || err));
              return this._failUninstallation(err2, cb);
            }
            this._finishUninstallation(deleteIconAndTile, deleteUserData, cb);
          }
        }.bind(this));
        return;
      } else {
        // well, we're just gonna pretend we did
        console.warn('Uninstall failed with error: ' + (err.stack || err) + ' but marking as uninstalled anyway.');
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
      this.trigger('uninstallend');
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

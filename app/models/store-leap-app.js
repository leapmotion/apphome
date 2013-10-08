var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var mv = require('mv');
var os = require('os');
var path = require('path');

var config = require('../../config/config.js');
var db = require('../utils/db.js');
var httpHelper = require('../utils/http-helper.js');
var extract = require('../utils/extract.js');
var oauth = require('../utils/oauth.js');
var mixpanel = require('../utils/mixpanel.js');
var shell = require('../utils/shell.js');
var url = require('url');

var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  idAttribute: 'appId',

  initialize: function() {
    LeapApp.prototype.initialize.apply(this, arguments);

    if ((this.get('state') === LeapApp.States.Ready) && !fs.existsSync(this.get('executable'))) {
      this.set('state', LeapApp.States.NotYetInstalled);
    }

    this.set('availableUpdate', null);
  },

  isStoreApp: function() {
    return true;
  },

  install: function(cb) {
    this.trigger('installstart');
    if (this.isUpdatable()) {
      mixpanel.trackAppUpgrade();
      this.set(this.get('availableUpdate').toJSON());
      console.log('Upgrading: ' + this.get('name'));

      // refresh icon and tile
      this.downloadIcon();
      this.downloadTile();

      this._installFromServer(function(err) {
        if (!err) {
          this.set('availableUpdate', null);
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
    this.set('state', LeapApp.States.Connecting);
    var binaryUrl = this.get('binaryUrl');
    console.log('checking for a local binary', binaryUrl, url.parse(binaryUrl).protocol);

    var tempFilename;
    function cleanupTempfileAndContinue(err) {
      try {
        if (tempFilename && fs.existsSync(tempFilename)) {
          fs.deleteSync(tempFilename);
        }
      } catch (e) {
        console.error('Failed to cleanup StoreLeapApp temp binary' + (e.stack || e));
        err = e;
      }
      cb && cb(err || null);
    };

    if (url.parse(binaryUrl).protocol == null) {
      var tempFilename = path.join(config.PlatformTempDirs[os.platform()], 'frozen', binaryUrl);
      console.log('Local binary detected. Extracting ' + tempFilename + ' to ' + this._appDir());

      if (os.platform() === 'win32') {
        extract.unzipApp(tempFilename, this._appDir(), true, cleanupTempfileAndContinue);
      } else if (os.platform() === 'darwin') {
        extract.undmgApp(tempFilename, this._appDir(), cleanupTempfileAndContinue);
      } else {
        return cb && cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
      cb && cb(null);
    } else {
      var downloadProgress;

      function cancelDownload() {
        if (downloadProgress && downloadProgress.cancel()) {
          this.off('cancel-download', cancelDownload);
          downloadProgress.removeAllListeners();
          downloadProgress = null;
          this.set('noAutoInstall', true);
          this.set('state', LeapApp.States.NotYetInstalled);
          this._shouldCancelDownload = false;
        } else {
          this._shouldCancelDownload = true;
        }
      }

      this.on('cancel-download', cancelDownload, this);

      console.warn('Downloading binary of ' + this.get('name') + ' from ' + binaryUrl);
      oauth.getAccessToken(function(err, accessToken) {
        if (err) {
          return cb(err);
        }
        downloadProgress = httpHelper.getToDisk(binaryUrl, { accessToken: accessToken }, function(err, tempFilename) {
          this.off('cancel-download');

          if (err) {
            return cb(err);
          }
          this.set('state', LeapApp.States.Installing);
          console.debug('Downloaded ' + this.get('name') + ' to ' + tempFilename);

          if (os.platform() === 'win32') {
            extract.unzipApp(tempFilename, this._appDir(), false, cleanupTempfileAndContinue);
          } else if (os.platform() === 'darwin') {
            extract.undmgApp(tempFilename, this._appDir(), cleanupTempfileAndContinue);
          } else {
            return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
          }
        }.bind(this));

        if (this._shouldCancelDownload) {
          cancelDownload();
        } else {
          downloadProgress.on('progress', function(progress) {
            if (this._shouldCancelDownload) {
              cancelDownload();
            } else {
              this.set('state', LeapApp.States.Downloading);
              this.trigger('progress', progress);
            }
          }.bind(this));
        }
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
        mixpanel.trackEvent('Install Failed', { appName: this.get('name'), appVersion: this.get('version'), error: err && err.stack });
      }
      this.set('state', LeapApp.States.NotYetInstalled);
    } else {
      console.info('Installation of ' + this.get('name') + ' complete');
      this.set('state', LeapApp.States.Ready);
      this.trigger('install');
    }
    cb && cb(err);
  },

  move: function(targetDirectory, cb) {
    var sourceExe = this.get('executable');
    if (!sourceExe) {
      return;
    }

    var sourceDirectory = path.dirname(sourceExe);

    targetDirectory = path.join(targetDirectory, String(uiGlobals.user_id));
    var targetExe = sourceExe.replace(sourceDirectory, targetDirectory);

    mv(sourceExe, targetExe, {mkdirp: true}, (function(err) {
      if (err) {
        cb && cb(err);
        return;
      }

      // Force regeneration of app dir
      delete this.__appDir;

      this.set('executable', targetExe);

      this.save();

      console.log('Moved ' + this.get('name') + ' from ' + sourceExe + ' to ' + targetExe);

      cb && cb(null);
    }).bind(this));
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

      mixpanel.trackAppUninstall({ appName: this.get('name'), appVersion: this.get('version') });
      return cb && cb(null);
    } catch (err) {
      return this._failUninstallation(err, cb);
    } finally {
      uiGlobals.myApps.remove(this);
      uiGlobals.uninstalledApps.add(this);
      this.set('state', LeapApp.States.Uninstalled);
      this.trigger('uninstall');
    }
  },

  _appDir: function() {
    var suffix = (os.platform() === 'darwin' ? '.app' : '');
    var userSetInstallDir = db.fetchObj(config.DbKeys.AppInstallDir);
    if (userSetInstallDir) {
      return path.join(userSetInstallDir, String(uiGlobals.user_id), this.cleanAppName() + suffix);
    } else {
      return  this._getDir(config.PlatformAppDirs, '__appDir', suffix);
    }
  },

  _userDataDir: function() {
    return this._getDir(config.PlatformUserDataDirs, '__userDataDir');
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
      dir = path.join(baseDir, String(uiGlobals.user_id), this.cleanAppName() + suffix);
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

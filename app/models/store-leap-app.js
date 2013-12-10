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
    if (this.hasUpdate()) {
      mixpanel.trackAppUpgrade();
      console.log('Upgrading: ' + this.get('name'));

      // update binary, tile, and icon urls from the new app version
      this.set(this.get('availableUpdate').pick('binaryUrl', 'tileUrl', 'iconUrl'));

      // refresh icon and tile
      if (window.navigator.onLine) {
        this.downloadIcon();
        this.downloadTile();
      }

      this._installFromServer(function(err) {
        if (!err) {
          var newAppJson = this.get('availableUpdate').toJSON();
          delete newAppJson.state;
          console.log('Update to version ' + newAppJson.versionId + ' successful');
          this.set(newAppJson);
          this.set('availableUpdate', null);
        }
        cb && cb(err);
      }.bind(this));
    } else {
      console.log('Installing: ' + this.get('name'));

      if (fs.existsSync(this._findExecutable())) {
        console.log('Existing app binary found.  Skipping download.');
        this._resetExecutable();
        this._installationComplete(null, cb);
      } else {
        this._installFromServer(cb);
      }
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
    var binaryUrl = this.get('binaryUrl');
    console.log('checking for a local binary', binaryUrl, url.parse(binaryUrl).protocol);

    var tempFilename;
    function cleanupTempfileAndContinue(err) {
      try {
        if (tempFilename && fs.existsSync(tempFilename)) {
          fs.removeSync(tempFilename);
        }
      } catch (e) {
        console.error('Failed to cleanup StoreLeapApp temp binary' + (e.stack || e));
        err = e;
      }
      cb && cb(err || null);
    };

    if (!url.parse(binaryUrl).protocol) {
      // Prebundled apps
      this.set('state', LeapApp.States.Installing);
      var tempFilename = path.join(config.PlatformTempDirs[os.platform()], 'frozen', binaryUrl);
      console.log('Local binary detected. Extracting ' + tempFilename + ' to ' + this._appDir());

      if (os.platform() === 'win32') {
        extract.unzipApp(tempFilename, this._appDir(), true, cleanupTempfileAndContinue);
      } else if (os.platform() === 'darwin') {
        extract.undmgApp(tempFilename, this._appDir(), cleanupTempfileAndContinue);
      } else {
        return cb && cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
    } else {
      var downloadProgress;

      if (!window.navigator.onLine) {
        var error = new Error('No internet connection');
        error.cancelled = true;
        return cb && cb(error);
      }

      this.set('state', LeapApp.States.Connecting);

      function cancelDownload() {
        if (downloadProgress && downloadProgress.cancel()) {
          this.off('cancel-download', cancelDownload);
          downloadProgress.removeAllListeners();
          downloadProgress = null;
          this.set('noAutoInstall', true);
          this._shouldCancelDownload = false;

          var error = new Error('Download cancelled');
          error.cancelled = true;
          cb && cb(error);
        } else {
          this._shouldCancelDownload = true;
        }
      }

      this.on('cancel-download', cancelDownload, this);

      console.log('Downloading binary of ' + this.get('name') + ' from ' + binaryUrl);
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

  _resetExecutable: function() {
    var executable = this._findExecutable();
    if (executable) {
      this.set('executable', executable);
      console.log('Reset executable to ' + executable);
    } else {
      this.set('state', LeapApp.States.NotYetInstalled);
      console.log('Could not find executable for app: ' + this.get('name'));
      return new Error('Could not find executable for app: ' + this.get('name'));
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
      var err = this._resetExecutable();
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
    } else {
      console.info('Installation of ' + this.get('name') + ' complete');
      this.trigger('install');
    }

    fs.exists(this.get('executable') || '', function(exists) {
      if (exists) {
        this.set('state', LeapApp.States.Ready);
      } else {
        this.set('state', LeapApp.States.NotYetInstalled);
      }
      cb && cb(err);
    }.bind(this));
  },

  move: function(targetDirectory, cb) {
    this.set('state', LeapApp.States.Moving);

    var sourceApp = this._appDir();
    console.log('Moving app ' + sourceApp + ' to ' + targetDirectory);
    if (!sourceApp) {
      console.log("Source app not detected");
      cb && cb(null);
      return;
    }

    var sourceDirectory = path.dirname(sourceApp);

    if (sourceDirectory == targetDirectory) {
      console.log("Moving to same location");
      this.set('state', LeapApp.States.Ready);
      cb && cb(null);
      return;
    }

    var targetApp = sourceApp.replace(sourceDirectory, targetDirectory);

    console.log('Moving ' + this.get('name') + ' from ' + sourceApp + ' to ' + targetApp);

    if (!fs.existsSync(sourceApp)) {
      // Just update the source
      this.set('state', LeapApp.States.NotYetInstalled);
      this.set('appDir', null);
      delete this.__appDir;
      this.save();

      cb && cb(null);
    } else {
      // Move all the things
      mv(sourceApp, targetApp, {mkdirp: true}, (function(err) {
        if (err) {
          console.warn('Error moving ' + this.get('name') + ': ' + (err.stack || err));
          cb && cb(err);
          return;
        }

        // Force regeneration of app dir
        this.set('appDir', null);
        delete this.__appDir;
        this._resetExecutable();

        this.save();

        if (os.platform() == 'darwin') {
          exec('xattr -rd com.apple.quarantine ' + shell.escape(targetApp), function(err3) {
            if (err3) {
              console.warn('xattr exec error, ignoring: ' + err3);
            }
          });
        }

        console.log('Moved ' + this.get('name') + ' from ' + sourceApp + ' to ' + targetApp);

        this.set('state', LeapApp.States.Ready);
        cb && cb(null);
      }).bind(this));
    }
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

      // Erase information about where it used to be installed, so if the directory
      // moves before it gets reinstalled, it gets installed to the new directory.
      this.set('appDir', null);
      delete this.__appDir;

      if (this.get('availableUpdate')) {
        // On reinstall, we will be downloading the new binary, etc
        // But since it won't register as an "update" we won't fetch new app details
        // So take the update we know about and push it into the app we're deleting.
        var newAppJson = this.get('availableUpdate').toJSON();
        delete newAppJson.state;
        this.set(newAppJson);
        this.set('availableUpdate', null);
      }

      this.trigger('uninstall');
    }
  },

  _appDir: function() {
    var appDir = this.get('appDir');
    if (appDir) {
      return appDir;
    }

    var suffix = (os.platform() === 'darwin' ? '.app' : '');
    var userSetInstallDir = db.fetchObj(config.DbKeys.AppInstallDir);
    var platformAppDirs = config.PlatformAppDirs;
    if (userSetInstallDir) {
      platformAppDirs[os.platform()] = [userSetInstallDir];
    }

    appDir = this._getDir(config.PlatformAppDirs, '__appDir', suffix);
    this.set('appDir', appDir);
    this.save();

    return appDir;
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
        var appFiles = [];
        try {
          appFiles = fs.readdirSync(this._appDir());
        } catch (e) {
          return '';
        }

        for (var i = 0, len = appFiles.length; i < len; i++) {
          if (/_lm\.exe$/i.test(appFiles[i])) {
            if (foundExecutable) { // multiple exe files in directory
              return '';
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

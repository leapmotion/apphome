var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var mv = require('mv');
var os = require('os');
var path = require('path');

var Q = require('q');
var Qfs = require('q-io/fs');
var ga = require('../utils/ga.js');
var config = require('../../config/config.js');
var db = require('../utils/db.js');
var httpHelper = require('../utils/http-helper.js');
var extract = require('../utils/extract.js');
var oauth = require('../utils/oauth.js');
var shell = require('../utils/shell.js');
var url = require('url');

var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  idAttribute: 'appId',

  className: 'StoreLeapApp',

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
      ga.trackEvent('apps/'+ this.get('name') +'/upgrade');
      console.log('Upgrading: ' + this.get('name'));

      // update binary, tile, and icon urls from the new app version
      // this automatically re-downloads the tile and icon
      var updatedAppJson = this.get('availableUpdate');
      this.set(_.pick(updatedAppJson, 'binaryUrl', 'tileUrl', 'iconUrl'));

      this._installFromServer(function(err) {
        if (!err) {
          delete updatedAppJson.state;
          console.log('Update to version ' + updatedAppJson.versionId + ' successful');
          this.set(updatedAppJson);
          this.set('availableUpdate', null);
          this.save();
        }
        cb && cb(err);
      }.bind(this));
    } else {
      console.log('Installing:', this.get('name'), this);

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

  _extractPrebundledBinary: function() {
    this.set('state', LeapApp.States.Installing);
    var tempFilename = path.join(config.PlatformTempDirs[os.platform()], 'frozen', this.get('binaryUrl'));
    console.log('Local binary detected. Extracting ' + tempFilename + ' to ' + this._appDir());

    return extract.extractApp(tempFilename, this._appDir(), true).fail(function(reason) {
      console.error(reason.stack || reason);
      throw reason;
    });
  },

  _cleanupTempFile: function(tempFilename) {
    console.log("Cleaning up temp file", tempFilename);
    return Qfs.removeTree(tempFilename).fail(function(reason) {
      console.error('Failed to cleanup StoreLeapApp temp binary' + (reason.stack || reason));
      throw reason;
    });
  },

  _downloadBinary: function(cb) {
    var _this = this;
    var binaryUrl = this.get('binaryUrl');

    if (!url.parse(binaryUrl).protocol) {
      // Prebundled apps
      return this._extractPrebundledBinary().nodeify(cb);
    } else {
      var downloadStream;

      if (!window.navigator.onLine) {
        var error = new Error('No internet connection');
        error.cancelled = true;
        return cb && cb(error);
      }

      this.set('state', LeapApp.States.Connecting);

      var canceller = Q.defer();
      this.on('cancel-download', function() {
        console.log('Cancelling download of', this.get('name'));
        canceller.resolve();
      });

      console.log('Downloading binary of ' + this.get('name') + ' from ' + binaryUrl);
      return Q.nfcall(oauth.getAccessToken).then(function(accessToken) {
        _this.set('state', LeapApp.States.Downloading);
        var downloadPromise = httpHelper.getToDisk(binaryUrl, {
          accessToken: accessToken,
          canceller: canceller.promise
        }).then(function(tempFilename) {
          _this.set('state', LeapApp.States.Installing);
          console.debug('Downloaded ' + _this.get('name') + ' to ' + tempFilename);
          return extract.extractApp(tempFilename, _this._appDir(), false).then(function() {
            return _this._cleanupTempFile(tempFilename);
          });
        },
        undefined, // Pass through error handler
        function(progress) {
          _this.trigger('progress', progress);
        });

        return downloadPromise.fail(function(reason) {
          if (reason.cancelled) {
            _this.set('noAutoInstall', true);
          }

          throw reason;
        }).fin(function() {
          _this.off('cancel-download');
        });
      }).nodeify(cb);
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
        ga.trackEvent('Install Failed', { appName: this.get('name'), appVersion: this.get('version'), error: err && err.stack });
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
      extract.chmodRecursiveSync(this._appDir());
      fs.removeSync(this._appDir());
    } catch(err) {
      // well, we're just gonna pretend we did
      console.warn('Uninstall failed with error: ' + (err.stack || err) + ' but marking as uninstalled anyway.');
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

      ga.trackEvent('apps/'+ this.get('name') +'/uninstall/'+this.get('version'));
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
        var newAppJson = this.get('availableUpdate');
        delete newAppJson.state;
        this.set(newAppJson);
        this.set('availableUpdate', null);
      }

      this.save();

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

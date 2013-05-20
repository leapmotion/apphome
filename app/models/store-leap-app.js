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

  isStoreApp: function() {
    return true;
  },

  // Listen on the 'progress' event on the return value of this function
  // to get download progress.
  install: function(cb) {
    this.set('state', LeapApp.States.Installing);

    // Can't use async.parallel here, because we want to
    // pass on the progress stream return value of this._downloadBinary()
    var numDownloads = 3;
    function callbackWhenAllDownloadsComplete(err) {
      numDownloads--;
      if (err) {
        this.set('state', LeapApp.States.InstallFailed);
        cb && cb(err);
      } else if(numDownloads <= 0) {
        this._findExecutable(function(err, executable) {
          if (err) {
            this.set('state', LeapApp.States.InstallFailed);
            cb && cb(err);
          } else {
            this.set('executable', executable);
            this.set('state', LeapApp.States.Ready);
            cb && cb(null);
          }
        }.bind(this));
      }
    }

    this._downloadIcon(callbackWhenAllDownloadsComplete.bind(this));
    this._downloadTile(callbackWhenAllDownloadsComplete.bind(this));
    var downloadProgress = this._downloadBinary(callbackWhenAllDownloadsComplete.bind(this));
    downloadProgress.on('progress', function(progress) {
      this.trigger('progress', progress);
    }.bind(this));
    return downloadProgress;
  },

  _downloadBinary: function(cb) {
    var binaryUrl = this.get('binaryUrl');
    return download.get(binaryUrl, function(err, tempFilename) {
      console.log('Downloading app from ' + binaryUrl + ' to: ' + tempFilename);
      if (os.platform() === 'win32') {
        extract.unzip(tempFilename, this._appDir(), cb);
      } else if (os.platform() === 'darwin') {
        extract.undmg(tempFilename, this._appDir(), cb);
      } else {
        return cb(new Error("Don't know how to install apps on platform: " + os.platform()));
      }
    }.bind(this));
  },

  _downloadIcon: function(cb) {
    var iconUrl = this.get('iconUrl');
    download.getWithFallback(iconUrl, this.standardIconPath(), config.Defaults.IconPath, function(err, iconPathOrFallback) {
      this.set('iconPath', iconPathOrFallback);
      cb(null);
    }.bind(this));
  },


  _downloadTile: function(cb) {
    var tileUrl = this.get('tileUrl');
    download.getWithFallback(tileUrl, this.standardTilePath(), config.Defaults.TilePath, function(err, tilePathOrFallback) {
      this.set('tilePath', tilePathOrFallback);
      cb(null);
    }.bind(this));
  },

  uninstall: function(deleteData, cb) {
    this.set('state', LeapApp.States.Uninstalling);

    var deletionFunctions = [
      function(callback) {
        fs.remove(this._appDir(), callback);
      }.bind(this)
    ];

/*    if (fs.existsSync(this.standardIconPath())) {
      deletionFunctions.push(function(callback) {
        fs.unlink(this.standardIconPath(), callback);
      }.bind(this));
    }

    if (fs.existsSync(this.standardTilePath())) {
      deletionFunctions.push(function(callback) {
        fs.unlink(this.standardTilePath(), callback);
      }.bind(this));
    }*/

    if (deleteData) {
      deletionFunctions.push(function(callback) {
        fs.remove(this._userDataDir(), callback);
      }.bind(this));
    }

    async.parallel(deletionFunctions, function(err) {
      if (err) {
        this.set('state', LeapApp.States.UninstallFailed);
        return cb && cb(err);
      } else {
        this.set('state', LeapApp.States.Uninstalled);
        return cb && cb(null);
      }
    }.bind(this));
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
  },

  _findExecutable: function(cb) {
    var executable;
    if (os.platform() === 'win32') {
      executable = path.join(this._appDir(), this.get('name') + '_LM.exe');
      cb(null, executable);
    } else if (os.platform() === 'darwin') {
      var infoPlistPath = path.join(this._appDir(), 'Contents', 'Info.plist');
      plist.parseFile(infoPlistPath, function(err, parsedPlist) {
        if (err) {
          return cb(err);
        }
        executable = path.join(this._appDir(), 'Contents', 'MacOS', parsedPlist.CFBundleExecutable);
        cb(null, executable);
      }.bind(this));
    } else {
      cb(new Error('Unknown platform: ' + os.platform()));
    }
  }

});

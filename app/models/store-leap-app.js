var async = require('async');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var url = require('url');

var LeapApp = require('./leap-app.js');
var appData = require('../utils/app-data.js');
var download = require('../utils/download.js');
var extract = require('../utils/extract.js');
var shell = require('../utils/shell.js');

var AppsDir = 'AirspaceApps';
var PlatformAppDirs = {
  win32:  path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, AppsDir),
  darwin: path.join(process.env.HOME, 'Applications', AppsDir),
  linux:  path.join(process.env.HOME, AppsDir)
};

var AppsUserDataDir = 'AirspaceApps';
var PlatformUserDataDirs = {
  win32:  path.join(process.env.APPDATA, AppsUserDataDir),
  darwin: path.join(process.env.HOME, 'Library', 'Application Support', AppsUserDataDir),
  linux:  path.join(process.env.HOME, '.config', AppsUserDataDir)
};

module.exports = LeapApp.extend({

  isStoreApp: function() {
    return true;
  },

  sortScore: function() {
    return 'b_' + (this.get('name'));
  },

  install: function(args, cb) {
    if (!args.appUrl) {
      return cb(new Error('Required arg: appUrl'));
    }

    //TODO: download tile or icon or something

    download(args.appUrl, function(err, tempFilename) {
      var originalFilename = url.parse(args.appUrl).pathname;
      if (/\.zip/i.test(originalFilename)) {
        extract.unzip(tempFilename, this._appDir(), finishInstallation.bind(this));
      } else if (/\.dmg/i.test(originalFilename)) {
        extract.undmg(tempFilename, this._appDir(), finishInstallation.bind(this));
      } else {
        return cb(new Error('Unknown file extension: ' + path.extname(originalFilename)));
      }

      function finishInstallation(err) {
        if (err) {
          return cb(err);
        }
        fs.remove(tempFilename, function(err) {
          if (err) {
            return cb(err);
          }

          // call _userDataDir once to ensure it's created
          this.set('isInstalled', !!this._userDataDir());
          cb(null);
        }.bind(this));
      }
    }.bind(this));
  },

  uninstall: function(deleteData, cb) {
    var deletionFunctions = [
      function(callback) {
        fs.remove(this._appDir(), callback);
      }.bind(this)
    ];
    if (deleteData) {
      deletionFunctions.push(function(callback) {
        fs.remove(this._userDataDir(), callback);
      }.bind(this));
    }
    // TODO: delete icon or tile or whatever
    async.parallel(deletionFunctions, function(err) {
      if (err) {
        return cb(err);
      }
      this.set('isInstalled', false);
      cb(null);
    });
  },

  launchCommand: function() {
    var platform = os.platform();
    if (platform === 'win32') {
      return shell.escape(path.join(this._appDir(), this.get('name') + '_LM.exe'));
    } else if (platform === 'darwin') {
      return 'open ' + shell.escape(this._appDir());
    }
  },

  tileFilename: function() {
    return appData.pathForFile('tile_' + this.get('id') + '.png');
  },

  _appDir: function() {
    return this._getDir(PlatformAppDirs, 'appDir');
  },

  _userDataDir: function() {
    return this._getDir(PlatformUserDataDirs, 'userDataDir');
  },

  _getDir: function(dirsByPlatform, attributeName) {
    var dir = this.get(attributeName);
    if (!dir) {
      if (!dirsByPlatform[os.platform()]) {
        throw new Error('Unknown operating system: ' + os.platform());
      }
      if (!this.get('name')) {
        throw new Error('No app name specified.');
      }
      var baseDir = dirsByPlatform[os.platform()];
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir);
      }
      dir = path.join(baseDir, this.get('name'));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      this.set(attributeName, dir);
    }
    return dir;
  }

});

var async = require('async');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var url = require('url');

var LeapApp = require('./leap-app.js');
var appData = require('../utils/app-data.js');
var download = require('../utils/download.js');
var extract = require('../utils/extract.js');
var plist = require('../utils/plist.js');
var shell = require('../utils/shell.js');

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

  sortScore: function() {
    return 'b_' + (this.get('name'));
  },

  install: function(args, cb) {
    if (!args.appUrl) {
      return cb(new Error('Required arg: appUrl'));
    }

    //TODO: download tile or icon or something

    download(args.appUrl, function(err, tempFilename) {
      console.log('App from ' + args.appUrl + ' downloaded to: ' + tempFilename);
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

          this._findExecutable(function(err) {
            if (err) {
              return cb(err);
            }

            // call _userDataDir once to ensure it's created
            this._userDataDir();

            this.set('isInstalled', true);
            cb(null);
          }.bind(this));
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
    }.bind(this));
  },

  launchCommand: function() {
    return shell.escape(this._executable);
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

  sortScore: function() {
    return 'b_' + (this.get('name'));
  },

  _findExecutable: function(cb) {
    if (!this._executable) {
      if (os.platform() === 'win32') {
        this._executable = path.join(this._appDir(), this.get('name') + '_LM.exe');
        cb(null, this._executable);
      } else if (os.platform() === 'darwin') {
        var infoPlistPath = path.join(this._appDir(), 'Contents', 'Info.plist');
        plist.parseFile(infoPlistPath, function(err, parsedPlist) {
          if (err) {
            return cb(err);
          }
          this._executable = path.join(this._appDir(), 'Contents', 'MacOS', parsedPlist.CFBundleExecutable);
          cb(null, this._executable);
        }.bind(this));
      } else {
        cb(new Error('Unknown platform: ' + os.platform()));
      }
    }
  }

});


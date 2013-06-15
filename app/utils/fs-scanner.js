var async = require('async');
var crypto = require('crypto')
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');

var plist = require('./plist.js');
var semver = require('./semver.js');
var shell = require('./shell.js');

var LocalLeapApp = require('../models/local-leap-app.js');

function FsScanner(allowedApps) {
  if (Array.isArray(allowedApps)) {
    this._allowedApps = {};
    allowedApps.forEach(function(allowedApp) {
      this._allowedApps[allowedApp.name.toLowerCase()] = allowedApp;
    }.bind(this));
  }
}

FsScanner.prototype = {

  scan: function(cb) {
    var platform = os.platform();

    function cleanData(err, apps) {
      if (err) {
        cb(err);
      }
      apps = _.uniq(_(apps).compact(), function(app) {
        return app.get('id');
      });
      cb(null, apps);
    }

    if (platform === 'win32') {
      this._scanForWindowsApps(cleanData);
    } else if (platform === 'darwin') {
      this._scanForMacApps(cleanData);
    } else {
      cb(new Error('Unknown system platform: ' + platform));
    }
  },

  _scanForMacApps: function(cb) {
    var userAppsDir = path.join(process.env.HOME || '', 'Applications');
    if (!fs.existsSync(userAppsDir)) {
      fs.mkdirSync(userAppsDir);
    }
    exec('find ~/Applications /Applications -maxdepth 4 -name Info.plist', function(err, stdout) {
      if (err) {
        return cb(err);
      }
      var plistPaths = stdout.toString().split('\n');
      plistPaths.pop(); // remove empty last path
      async.mapLimit(plistPaths, 4, this._createLeapAppFromPlistPath.bind(this),
        function(err, leapApps) {
          if (err) {
            return cb(err);
          }
          cb(null, leapApps);
        });
    }.bind(this));
  },

  _createLeapAppFromPlistPath: function(plistPath, cb) {
    plist.parseFile(plistPath, function(err, parsedPlist) {
      if (err) {
        return cb(err);
      }
      var keyFile = path.dirname(path.dirname(plistPath));

      var attributes = {
        name: parsedPlist.CFBundleDisplayName || parsedPlist.CFBundleName || parsedPlist.CFBundleExecutable,
        version: parsedPlist.CFBundleShortVersionString || parsedPlist.CFBundleVersion,
        keyFile: keyFile,
        relativeExePath: path.join('Contents', 'MacOS', parsedPlist.CFBundleExecutable)
      };

      var icon = parsedPlist.CFBundleIcon || parsedPlist.CFBundleIconFile;
      if (icon) {
        if (!path.extname(icon)) {
          icon = icon + '.icns';
        }
        attributes.rawIconFile = path.join(keyFile, 'Contents', 'Resources', icon);
      }

      cb(null, this._createLocalLeapApp(attributes));
    }.bind(this));
  },

  _scanForWindowsApps: function(cb) {
    var registryQueries = [
      function(cb) { // system-wide apps for system architecture
        exec('reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s', cb);
      },
      function(cb) { // user apps (32- and 64-bit)
        exec('reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s', cb);
      }
    ];
    if (process.env.ProgramW6432) { // running on 64-bit Windows
      registryQueries.push(function(cb) { // system-wide 32-bit apps on 64-bit Windows
        exec('reg query HKLM\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s', cb);
      });
    }
    async.parallel(registryQueries, function(err, stdouts) {
      if (err) {
        return cb(err);
      }
      var registryChunks = _.invoke(stdouts, 'toString').join('\n').split(/^HKEY_LOCAL_MACHINE|^HKEY_CURRENT_USER/m);
      registryChunks.shift(); // remove empty first chunk
      async.map(registryChunks, this._createLeapAppFromRegistryChunk.bind(this),
        function(err, leapApps) {
          if (err) {
            return cb(err);
          }
          cb(null, leapApps);
        });
    }.bind(this));
  },

  _createLeapAppFromRegistryChunk: function(registryChunk, cb) {
    function extractValueForKey(key, type) {
      type = type || 'REG_SZ';
      var regex = new RegExp(key + ' +' + type + ' +([^\\n]+)');
      var match = registryChunk.match(regex);
      var firstGroup = (match && match[1]) || '';
      return firstGroup.replace(/^\s+|\s+$/g, '');
    }

    var attributes = {
      name: extractValueForKey('DisplayName'),
      version: extractValueForKey('DisplayVersion'),
      keyFile: extractValueForKey('InstallLocation')
    };

    var allowedApp = this._getAllowedApp(attributes.name);
    if (allowedApp && allowedApp.relativeExePath) {
      attributes.relativeExePath = allowedApp.relativeExePath;
      attributes.rawIconFile = path.join(attributes.keyFile, attributes.relativeExePath);
    }

    cb(null, this._createLocalLeapApp(attributes));
  },

  _createLocalLeapApp: function(attributes) {
    if (!attributes.keyFile || !attributes.name || !attributes.version ||
        !this._isAllowedApp(attributes.name, attributes.version)) {
      return null;
    }

    return new LocalLeapApp(attributes);
  },

  _getAllowedApp: function(appName) {
    return this._allowedApps && this._allowedApps[appName.toLowerCase()];
  },

  _isAllowedApp: function(appName, appVersion) {
    if (!appName) {
      return false;
    } else if (!this._allowedApps) {
      return true;
    } else {
      var allowedApp = this._getAllowedApp(appName);
      if (allowedApp) {
        return (allowedApp.minVersion ?
                (semver.isFirstGreaterThanSecond(appVersion, allowedApp.minVersion) ||
                 semver.areEqual(appVersion, allowedApp.minVersion)) :
                true);
      } else {
        return false;
      }
    }
  }

};

module.exports = FsScanner;


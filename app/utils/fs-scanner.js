var async = require('async');
var crypto = require('crypto')
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');
var plist = require('plist');

var semver = require('./semver.js');
var shell = require('./shell.js');

var LocalLeapApp = require('../models/local-leap-app.js');

function FsScanner(args) {
  args = args || {};
  if (Array.isArray(args.allowedApps)) {
    this._allowedApps = {};
    args.allowedApps.forEach(function(allowedApp) {
      this._allowedApps[allowedApp.name.toLowerCase()] = allowedApp;
    }.bind(this));
  }
}

FsScanner.prototype = {

  scan: function(cb) {
    var platform = os.platform();

    if (platform === 'win32') {
      this._scanForWindowsApps(cb);
    } else if (platform === 'darwin') {
      this._scanForMacApps(cb);
    } else {
      throw new Error('Unknown system platform: ' + platform);
    }
  },

  _scanForMacApps: function(cb) {
    fs.mkdirSync('~/Applications');
    exec('find ~/Applications /Applications -maxdepth 4 -name Info.plist', function(err, stdout) {
      if (err) {
        return cb(err);
      }
      var plistPaths = stdout.toString().split('\n');
      plistPaths.pop(); // remove empty last path
      async.mapLimit(plistPaths, 64, this._createLeapAppFromPlistPath.bind(this),
        function(err, leapApps) {
          if (err) {
            return cb(err);
          }
          cb(null, _.compact(leapApps));
        });
    }.bind(this));
  },

  _createLeapAppFromPlistPath: function(plistPath, cb) {
    exec('plutil -convert xml1 -o - ' + shell.escape(plistPath), function(err, stdout) {
      if (err) {
        return cb(err);
      }
      try {
        var parsedPlist = plist.parseStringSync(stdout.toString());
      } catch (err) {
        console.warn('Error handling plist: ' + plistPath);
        return cb(null, null);
      }
      var keyFile = path.dirname(path.dirname(plistPath));

      var attributes = {
        name: parsedPlist.CFBundleDisplayName || parsedPlist.CFBundleName || parsedPlist.CFBundleExecutable,
        version: parsedPlist.CFBundleVersion || parsedPlist.CFBundleShortVersionString,
        rawIconFile: parsedPlist.CFBundleIcon || parsedPlist.CFBundleIconFile,
        keyFile: keyFile
      };

      attributes.rawIconFile = attributes.rawIconFile && path.join(keyFile, attributes.rawIconFile);

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
          cb(null, _.compact(leapApps));
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

    cb(null, this._createLocalLeapApp(attributes));
  },

  _createLocalLeapApp: function(attributes) {
    if (!attributes.keyFile || !attributes.name || !attributes.version ||
        !this._isAllowedApp(attributes.name, attributes.version)) {
      return null;
    }
    
    var allowedApp = this._getAllowedApp(attributes.name);
    if (allowedApp && allowedApp.relativeExePath) {
      attributes.relativeExePath = allowedApp.relativeExePath;  
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
        return (allowedApp.minVersion ? semver.meetsMinimumVersion(appVersion, allowedApp.minVersion) : true);
      } else {
        return false;
      }
    }
  }

};

module.exports = FsScanner;

var os = require('os');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var crypto = require('crypto');
var async = require('async');
var plist = require('plist');
var shell = require('./shell.js');

var LocalLeapApp = require('../models/local-leap-app.js');

function FsScanner(args) {
  args = args || {};
  if (Array.isArray(args.allowedAppNames)) {
    this._allowedAppNames = {};
    args.allowedAppNames.forEach(function(appName) {
      this._allowedAppNames[appName.toLowerCase()] = true;
    }.bind(this));
  } else {
    this._allowedAppNames = args.allowedAppNames;
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
    exec('mkdir -p ~/Applications; find ~/Applications /Applications -maxdepth 4 -name Info.plist', function(err, stdout) {
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
      var parsedPlist = plist.parseStringSync(stdout.toString());
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
    async.parallel([
      function(cb) {
        exec('reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s', cb);
      },
      function(cb) {
        exec('reg query HKLM\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s', cb);
      }
    ], function(err, stdouts) {
      if (err) {
        return cb(err);
      }
      var registryChunks = _.invoke(stdouts, 'toString').join('\n').split(/^HKEY_LOCAL_MACHINE/m);
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
    if (!attributes.keyFile || !attributes.name ||
        !attributes.version || !this._isAllowedAppName(attributes.name)) {
      return null;
    }

    var md5hash = crypto.createHash('md5');
    md5hash.update(attributes.keyFile);
    attributes.id = md5hash.digest('hex');

    return new LocalLeapApp(attributes);
  },

  _isAllowedAppName: function(appName) {
    if (!appName) {
      return false;
    } else if (!this._allowedAppNames) {
      return true;
    } else {
      return !!this._allowedAppNames[appName.toLowerCase()];
    }
  }

};

module.exports = FsScanner;

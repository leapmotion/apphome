var os = require('os');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var crypto = require('crypto');
var async = require('async');
var plist = require('plist');

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
    exec('find ~/Applications /Applications -maxdepth 4 -name Info.plist', function(err, stdout) {
      if (err) {
        return cb(err);
      }
      var plistPaths = stdout.toString().split('\n');
      var leapApps = [];
      plistPaths.forEach(function(plistPath) {
        leapApps.push(this._createLeapAppFromPlistPath(plistPath));
      }.bind(this));

      cb(null, _.compact(leapApps));
    }.bind(this));
  },

  _createLeapAppFromPlistPath: function(plistPath) {
    var parsedPlist = plist.parseStringSync(fs.readFileSync(plistPath, 'utf-8'));
    var keyFile = path.dirname(path.dirname(plistPath));
    var attributes = {
      name: parsedPlist.CFBundleDisplayName || parsedPlist.CFBundleName || parsedPlist.CFBundleExecutable,
      version: parsedPlist.CFBundleVersion,
      keyFile: keyFile
    };

    return this._createLocalLeapApp(attributes);
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
      var registryChunks = _.invoke(stdouts, 'toString').join('\n').split('HKEY_LOCAL_MACHINE');
      registryChunks.shift(); // remove empty first chunk
      var leapApps = [];
      registryChunks.forEach(function(registryChunk) {
        leapApps.push(this._createLeapAppFromRegistryChunk(registryChunk));
      }.bind(this));
      cb(null, _.compact(leapApps));
    }.bind(this));
  },

  _createLeapAppFromRegistryChunk: function(registryChunk) {
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
    }

    return this._createLocalLeapApp(attributes);
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

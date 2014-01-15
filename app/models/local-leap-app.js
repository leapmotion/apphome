var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var path = require('path');

var Q = require('q');

var api = require('../utils/api.js');
var config = require('../../config/config.js');
var icns = require('../utils/icns.js');
var ico = require('../utils/ico.js');
var shell = require('../utils/shell.js');
var FsScanner = require('../utils/fs-scanner.js');

var LeapApp = require('./leap-app.js');


var LocalLeapApp = LeapApp.extend({
  className: 'LocalLeapApp',

  constructor: function(args) {
    if (!args.keyFile && args.relativeExePath) {
      try {
        var keyFile;
        if (os.platform() === 'win32') {
          keyFile = path.join(process.env.PROGRAMFILES, args.relativeExePath);
          if (fs.existsSync(keyFile)) {
            args.keyFile = keyFile;
          } else if (process.env['PROGRAMFILES(X86)']) {
            keyFile = path.join(process.env['PROGRAMFILES(X86)'], args.relativeExePath);
            if (fs.existsSync(keyFile)) {
              args.keyFile = keyFile;
            }
          }
        } else if (os.platform() === 'darwin') {
          keyFile = path.join('/Applications', args.relativeExePath);
          if (fs.existsSync(keyFile)) {
            args.keyFile = keyFile;
          } else {
            keyFile = path.join(process.env.HOME, 'Applications', args.relativeExePath);
            if (fs.existsSync(keyFile)) {
              args.keyFile = keyFile;
            }
          }
        }
        if (!args.executable) {
          args.executable = args.keyFile;
        }
      } catch(err) {
        console.error('LocalLeapApp#constructor failed. ' + (err.stack || err));
      }
    }

    if (!args.id) {
      if (!args.keyFile) {
        throw new Error('No id and no keyFile set.');
      } else {
        args.id = this._makeIdFromKeyFile(args.keyFile);
      }
    }

    if (!args.executable) {
      if (args.relativeExePath) {
        args.executable = path.join(args.keyFile, args.relativeExePath);
      } else {
        args.executable = path.join(args.keyFile);
      }
    }

    if (!args.tileUrl) {
      args.tilePath = config.LocalAppTilePath;
    }

    args.deletable = false;

    LeapApp.prototype.constructor.call(this, args);
  },

  _makeIdFromKeyFile: function(keyFile) {
    var md5hash = crypto.createHash('md5');
    md5hash.update(keyFile);
    return md5hash.digest('hex');
  },

  isLocalApp: function() {
    return true;
  },

  isBuiltinTile: function() {
    return !this.get('deletable');
  },

  isValid: function() {
    try {
      return fs.existsSync(this.get('keyFile')) && fs.existsSync(this.get('executable'));
    } catch (e) {
      return false;
    }
  },

  install: function(cb) {
    this.trigger('installstart');
    this.set('state', LeapApp.States.Installing);
    var rawIconFile = this.get('rawIconFile');
    if (rawIconFile) {
      var conversionModule;
      if (/\.icns$/i.test(rawIconFile)) {
        conversionModule = icns;
      } else if (os.platform() === 'win32') {
        conversionModule = ico;
      }

      if (conversionModule) {
        conversionModule.convertToPng(rawIconFile, this.standardIconPath(), function(err) {
          if (err) {
            console.error(err.stack || err);
          }
          this._finishInstallation(!!err, cb);
        }.bind(this));
      } else {
        this._finishInstallation(true, cb);
      }
    } else {
      this._finishInstallation(true, cb);
    }

  },

  _finishInstallation: function(noIcon, cb) {
    this.set('iconPath', noIcon ? '' : this.standardIconPath());
    this.set('state', LeapApp.States.Ready);
    cb && cb(null);
  },

  uninstall: function(deleteData, cb) {
    this.set('installedAt', null);
    this.set('state', LeapApp.States.Uninstalled);
    cb && cb(null);
  }
});



function explicitPathApps(appJsonList) {
  var relevantApps = appJsonList.filter(function(appJson) {
    return !appJson.findByScanning;
  });

  api.syncToCollection(relevantApps, uiGlobals.myApps, function(app) {
    return app.isLocalApp() && !app.get('findByScanning');
  });
}

var isScanningFileSystem = false;
function localAppScan(appJsonList) {
  if (!appJsonList) {
    isScanningFileSystem = false;
    return;
  }
  if (isScanningFileSystem) {
    return;
  }
  isScanningFileSystem = true;

  var fsScanner = new FsScanner(appJsonList);
  Q.nfcall(fsScanner.scan.bind(fsScanner)).then(function(appJsonList) {
    api.syncToCollection(appJsonList, uiGlobals.myApps, function(app) {
      return app.isLocalApp() && app.get('findbyScanning');
    });
  }.bind(this)).done();
}

module.exports = LocalLeapApp;
module.exports.localAppScan = localAppScan;
module.exports.createExplicitPathApps = explicitPathApps;

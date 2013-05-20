var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var path = require('path');

var appData = require('../utils/app-data.js');
var config = require('../../config/config.js');
var icns = require('../utils/icns.js');
var ico = require('../utils/ico.js');
var shell = require('../utils/shell.js');

var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  constructor: function(args) {
    if (!args.id) {
      if (!args.keyFile) {
        throw new Error('No id and no keyFile set.');
      } else {
        args.id = this._makeIdFromKeyFile(args.keyFile);
      }
    }

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

  install: function(cb) {
    this.set('state', LeapApp.States.Installing);
    var rawIconFile = this.get('rawIconFile');
    var conversionModule;
    if (/\.icns$/i.test(rawIconFile)) {
      conversionModule = icns;
    } else if (os.platform() === 'win32') {
      conversionModule = ico;
    }

    if (conversionModule) {
      conversionModule.convertToPng(rawIconFile, this.standardIconPath(), finishInstallation.bind(this));
    } else {
      finishInstallation.call(this, true);
    }

    function finishInstallation(err) {
      this.set('iconPath', err ? config.Defaults.IconPath : this.standardIconPath());
      this.set('tilePath', config.Defaults.TilePath);
      this.set('state', LeapApp.States.Ready);
      cb && cb(null);
    }
  },

  uninstall: function(deleteData, cb) {
    this.set('state', LeapApp.States.Uninstalling);
    if (this.get('iconPath')) {
      try {
        fs.unlinkSync(this.get('iconPath'));
      } catch(err) {
        this.set('state', LeapApp.States.UninstallFailed);
        return cb && cb(err);
      }
    }
    this.set('state', LeapApp.States.Uninstalled);
    cb && cb(null);
  },

  launchCommand: function() {
    return shell.escape(path.join(this.get('keyFile'), this.get('relativeExePath')));
  }

});

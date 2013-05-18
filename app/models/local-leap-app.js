var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var path = require('path');

var LeapApp = require('./leap-app.js');
var icns = require('../utils/icns.js');
var ico = require('../utils/ico.js');
var shell = require('../utils/shell.js');
var appData = require('../utils/app-data.js');

module.exports = LeapApp.extend({

  constructor: function(args) {
    if (!args.id) {
      if (!args.keyFile) {
        throw new Error('No id and no keyFile set.');
      } else {
        args.id = this._makeIdFromKeyFile(args.keyFile);
      }
    }

    LeapApp.call(this, args);
  },

  isLocalApp: function() {
    return true;
  },

  _makeIdFromKeyFile: function(keyFile) {
    var md5hash = crypto.createHash('md5');
    md5hash.update(keyFile);
    return md5hash.digest('hex');
  },

  install: function(cb) {
    var filename = this.get('rawIconFile');
    var conversionModule;
    if (/\.icns$/i.test(filename)) {
      conversionModule = icns;
    } else if (os.platform() === 'win32') {
      conversionModule = ico;
    } else {
      return finishInstallation.call(this, false);
    }
    conversionModule.convertToPng(filename, this.iconFilename(), finishInstallation.bind(this));

    function finishInstallation(err) {
      this.set('hasTile', true);
      this.set('hasIcon', err === null);
      this.set('isInstalled', true);
      cb(err ? err : null);
    }
  },

  uninstall: function(deleteData, cb) {
    if (this.hasIcon()) {
      fs.unlinkSync(this.iconFilename());
    }
    this.set('isInstalled', false);
    cb(null);
  },

  launchCommand: function() {
    return shell.escape(path.join(this.get('keyFile'), this.get('relativeExePath')));
  },

  iconFilename: function() {
    return path.join(appData.getDir(), CONFIG.AppSubdir.AppIcons, 'icon_' + this.id + '.png');
  },

  sortScore: function() {
    return 'x_' + (this.get('name'));
  }


});


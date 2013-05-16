var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var path = require('path');

var LeapApp = require('./leap-app.js');
var icns = require('../utils/icns.js');
var shell = require('../utils/shell.js');

module.exports = LeapApp.extend({

  constructor: function(args) {
    if (!args.id) {
      if (!args.keyFile) {
        throw new Error('No id and no keyFile set.');
      } else {
        args.id = this._makeIdFromKeyFile(args.keyFile);
      }
    }

    if (os.platform() === 'win32' && !args.relativeExePath) {
      throw new Error('relativeExePath must be set on Windows');
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

  install: function(args, cb) {
    var filename = args.rawIconFile;
    var conversionModule;
    if (/\.icns$/i.test(filename)) {
      conversionModule = icns;
    } else if (os.platform() === 'win32') {
      conversionModule = ico;
    } else {
      return cb(new Error("Don't know how to convert to PNG: " + filename));
    }
    conversionModule.convertToPng(filename, this.iconFilename(), function(err) {
      this.set('hasTile', true);
      this.set('hasIcon', !err);
      this.set('isInstalled', true);
      cb(err);
    }.bind(this));
  },

  uninstall: function(deleteData, cb) {
    if (this.hasIcon()) {
      fs.unlinkSync(this.iconFilename());
    }
    this.set('isInstalled', false);
    cb(null);
  },

  launch: function() {
    var platform = os.platform();
    if (platform === 'win32') {
      return shell.escape(path.join(this.get('keyFile'), this.get('relativeExePath')));
    } else if (platform === 'darwin') {
      return 'open ' + shell.escape(this.get('keyFile'));
    }
  },

  tileFilename: function() {
    // TODO: determine correct tile based on icon colors
    return path.join(__dirname, '..', '..', 'static', 'images', 'default-tile.png');
  },

  sortScore: function() {
    return 'x_' + (this.get('name'));
  }

});

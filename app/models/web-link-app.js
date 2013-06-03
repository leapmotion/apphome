var crypto = require('crypto');

var config = require('../../config/config.js');

var LeapApp = require('./leap-app.js');

var WebLinkApp = LeapApp.extend({

  constructor: function(args) {
    args = args || {};
    args.isBuiltin = !args.deletable;
    args.state = LeapApp.States.Ready;

    var md5hash = crypto.createHash('md5');
    md5hash.update(args.urlToLaunch);
    args.id = md5hash.digest('hex');

    LeapApp.prototype.constructor.call(this, args);
  },

  initialize: function() {
    if (!this.get('iconPath')) {
      this.downloadIcon();
    }

    if (!this.get('tilePath')) {
      this.downloadTile();
    }

    LeapApp.prototype.initialize.apply(this, arguments);
  },

  isBuiltinTile: function() {
    return this.get('isBuiltin');
  },

  isWebLinkApp: function() {
    return true;
  },

  sortScore: function() {
    return (this.isBuiltinTile() ? 'a_' + this.get('name') : LeapApp.prototype.sortScore.apply(this, arguments));
  },

  launch: function() {
    nwGui.Shell.openExternal(this.get('urlToLaunch'));
  }

});

WebLinkApp.createBuiltinTiles = function() {
  console.log("Creating builtin tiles");
  config.BuiltinTiles.forEach(function(args) {
    uiGlobals.installedApps.add(new BuiltinTileApp(args));
  });
};

module.exports = WebLinkApp;

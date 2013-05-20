var config = require('../../config/config.js');

var LeapApp = require('./leap-app.js');

var BuiltinTileApp = LeapApp.extend({

  initialize: function() {
    this.set('isBuiltin', true);
    this.set('state', LeapApp.States.Ready);

    LeapApp.prototype.initialize.apply(this, arguments);
  },

  isBuiltinTile: function() {
    return true;
  },

  sortScore: function() {
    return 'a_' + (this.get('ndx') || '0');
  },

  launch: function() {
    this.get('launchCallback')();
  }

});

BuiltinTileApp.createBuiltinTiles = function() {
  console.log("Creating builtin tiles");
  config.BuiltinTiles.forEach(function(args) {
    uiGlobals.installedApps.add(new BuiltinTileApp(args));
  });
};

module.exports = BuiltinTileApp;

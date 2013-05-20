var config = require('../../config/config.js');

var LeapApp = require('./leap-app.js');

var BuiltinTileApp = LeapApp.extend({

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
    uiGlobals.leapApps.add(new BuiltinTileApp(args));
  });
};

module.exports = BuiltinTileApp;

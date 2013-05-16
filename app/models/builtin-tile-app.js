var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  isBuiltinTile: function() {
    return true;
  },

  sortScore: function() {
    return '0_' + (this.get('ndx') || '0');
  }

});


module.exports.createBuiltinTiles = function() {
  var tiles = [
    {
      id: 'builtin_store'
    }
  ];
  _(tiles).invoke(uiGlobals.leapApps.add);
};

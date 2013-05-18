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
  console.log("Creating builtin tiles");
  var builtins = [
    { id: uiGlobals.Builtin.VisitStore, name: 'Visit App Store' }
//    { id: uiGlobals.Builtin.ErrorTile }
  ];
  builtins.forEach(function(builtinData) {
    builtinData.is_builtin = true;
    uiGlobals.leapApps.add(builtinData);
  });
};

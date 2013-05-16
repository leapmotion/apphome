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
  console.log('tmp - uiGlobals.Builtin.VisitStore ' + uiGlobals.Builtin.VisitStore);
  var builtins = [
    { id: uiGlobals.Builtin.VisitStore }
  ];
  builtins.forEach(function(builtinData) {
    builtinData.is_builtin = true;
    uiGlobals.leapApps.add(builtinData);
  });

};

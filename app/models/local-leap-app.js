var os = require('os');
var LeapApp = require('./leap-app.js');
var icns = require('../utils/icns.js');

module.exports = LeapApp.extend({

  constructor: function(args) {
    if (args.rawIconFile) {
      this.convertIcon(args.rawIconFile);
      delete args.rawIconFile;
    }
    LeapApp.call(this, args);
  },

  isLocalApp: function() {
    return true;
  },

  convertIcon: function(filename) {

  },

  sortScore: function() {
    return 'x_' + (this.get('name'));
  }


});

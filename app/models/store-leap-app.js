var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  isStoreApp: function() {
    return true;
  },

  sortScore: function() {
    return 'b_' + (this.get('name'));
  }
});

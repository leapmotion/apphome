var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  isLocalApp: function() {
    return true;
  },

  isStoreApp: function() {
    return false;
  }

});

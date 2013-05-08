var LeapApp = require('./leap-app.js');

module.exports = LeapApp.extend({

  isLocalApp: function() {
    return false;
  },

  isStoreApp: function() {
    return true;
  }

});

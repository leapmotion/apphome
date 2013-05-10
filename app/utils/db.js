var dbName = global.leapEnv;
var prefix = dbName + ':';

module.exports = {
  getItem: function(key) {
    return window.localStorage.getItem(prefix + key);
  },

  setItem: function(key, value) {
    return window.localStorage.setItem(prefix + key, value);
  },

  removeItem: function(key) {
    return window.localStorage.removeItem(prefix + key);
  }
};

_([ 'clear', 'key', 'length']).each(function(fnName) {
  module.exports[fnName] = function() {
    return window.localStorage[fnName].apply(null, arguments);
  }
});

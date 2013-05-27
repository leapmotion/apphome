var dbPrefix;

module.exports = {
  getItem: function(key) {
    return window.localStorage.getItem(dbPrefix + key);
  },

  setItem: function(key, value) {
    return window.localStorage.setItem(dbPrefix + key, value);
  },

  removeItem: function(key) {
    return window.localStorage.removeItem(dbPrefix + key);
  }

};

_([ 'clear', 'key', 'length']).each(function(fnName) {
  module.exports[fnName] = function() {
    return window.localStorage[fnName].apply(null, arguments);
  }
});


function setDbName(dbName) {
  dbPrefix = dbName + ':';
}
module.exports.setDbName = setDbName;
setDbName(global.leapEnv || 'production');

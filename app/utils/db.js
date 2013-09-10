var dbPrefix;

var db = module.exports = {
  saveObj: function(key, value) {
    db.setItem(key, JSON.stringify(value));
  },

  fetchObj: function(key) {
    var val = db.getItem(key);
    if (!val) {
      return void 0;
    }
    try {
      return JSON.parse(val);
    } catch (err) {
      return void 0;
    }
  },

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
  };
});


function setDbName(dbName) {
  dbPrefix = dbName + ':';
}
module.exports.setDbName = setDbName;
setDbName(process.env.LEAPHOME_ENV || 'production');

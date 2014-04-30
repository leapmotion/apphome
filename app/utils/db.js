// Generated by CoffeeScript 1.7.1
(function() {
  var config, db, dbPrefix, setDbName;

  config = require("../../config/config.js");

  dbPrefix = void 0;

  db = module.exports = {
    saveObj: function(key, value) {
      if (_(config.DbKeys).values().indexOf(key) === -1) {
        throw new Error(key + " not in " + _(config.DbKeys).values());
      }
      return db.setItem(key, JSON.stringify(value));
    },
    fetchObj: function(key) {
      var err, val;
      if (_(config.DbKeys).values().indexOf(key) === -1) {
        throw new Error(key + " not in " + _(config.DbKeys).values());
      }
      val = db.getItem(key);
      if (!val) {
        return void 0;
      }
      try {
        return JSON.parse(val);
      } catch (_error) {
        err = _error;
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

  _(["clear", "key", "length"]).each(function(fnName) {
    return module.exports[fnName] = function() {
      return window.localStorage[fnName].apply(null, arguments);
    };
  });

  setDbName = function(dbName) {
    return dbPrefix = dbName + ":";
  };

  module.exports.setDbName = setDbName;

  setDbName(process.env.LEAPHOME_ENV || "production");

}).call(this);

// Generated by CoffeeScript 1.7.1
(function() {
  var db;

  db = require('./db.js');

  module.exports = cache;

  cache.proto = cache(function() {
    return Object.defineProperty(Function.prototype, 'cache', {
      value: function() {
        return cache(this);
      },
      configurable: true
    });
  });

  cache(function(fn, dbKey) {
    var f;
    f = function() {
      var value;
      if (f.called) {
        return f.value;
      }
      value = db.fetchObj(dbKey);
      if (value) {
        f.value = value;
        f.called = true;
        return f.value;
      }
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };
    f.called = false;
    return f;
  });

}).call(this);

var db = require('./db.js');
var config = require('../../config/config.js');

function count() {
  return db.fetchObj(config.DbKeys.CrashCount) || 0;
}

function increment() {
  db.saveObj(config.DbKeys.CrashCount, count() + 1);
}

function reset() {
  db.saveObj(config.DbKeys.CrashCount, 0);
}


module.exports.count = count;
module.exports.increment = increment;
module.exports.reset = reset;

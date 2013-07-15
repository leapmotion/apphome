var db = require('./db.js');

var Key = 'crashCount';

function count() {
  return db.fetchObj(Key) || 0;
}

function increment() {
  db.saveObj(Key, count() + 1);
}

function reset() {
  db.saveObj(Key, 0);
}


module.exports.count = count;
module.exports.increment = increment;
module.exports.reset = reset;

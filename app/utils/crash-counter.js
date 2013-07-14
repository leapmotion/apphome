var db = require('./db.js');

var Key = 'crashCount';

function count() {
  return db.getItem(Key) || 0;
}

function increment() {
  db.setItem(Key, count() + 1);
}

function reset() {
  db.setItem(Key, 0);
}


module.exports.count = count;
module.exports.increment = increment;
module.exports.reset = reset;

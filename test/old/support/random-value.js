function randomInt(maxLen) {
  return Math.floor(Math.random() * Math.pow(10, maxLen));
}

function randomLetter() {
  return Math.random().toString(36).substr(3, 1);
}

function randomString(len) {
  var res = [];
  for (var i=0; i < len; i++) {
    res.push(randomLetter());
  }
  return res.join('');
}

module.exports.randomInt = randomInt;
module.exports.randomString = randomString;
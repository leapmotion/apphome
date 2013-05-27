var dns = require('dns');

var isConnected = false;

function checkInternetConnection() {
  var domain = Math.round(Math.random() * 99999999999) + '.leapmotion.com';
  dns.resolve(domain, function(err) {
    isConnected = (!err || err.code === dns.NOTFOUND);
    setTimeout(checkInternetConnection, 1000);
  });
}

checkInternetConnection();

module.exports.isConnected = function() {
  console.log(isConnected ? 'internet!' : 'no internet :(');
  return isConnected;
};

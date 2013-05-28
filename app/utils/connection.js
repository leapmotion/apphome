var dns = require('dns');

var isConnected = true;

function checkInternetConnection() {
  var domain = Math.round(Math.random() * 99999999999) + '.leapmotion.com';
  dns.resolve(domain, function(err) {
    isConnected = (!err || err.code === dns.NOTFOUND);
    setTimeout(checkInternetConnection, 10000);
  });
}

checkInternetConnection();

module.exports.isConnected = function() {
  return isConnected;
};

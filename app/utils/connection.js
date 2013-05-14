var dns = require('dns');

function checkInternetConnection(cb) {
  var domain = Math.round(Math.random() * 99999999999) + '.leapmotion.com';
  dns.resolve(domain, function(err) {
    var isConnected = (!err || err.code === dns.NOTFOUND);
    cb(null, isConnected);
  });
}

module.exports.check = checkInternetConnection;

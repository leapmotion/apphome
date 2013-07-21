var dns = require('dns');

var MinPollingIntervalMs = 5000;
var lastCheck;
var lastIsConnected;

function checkInternetConnection(cb) {
  if (lastCheck && (new Date()).getTime() - lastCheck < MinPollingIntervalMs) {
    cb && cb(lastIsConnected);
  } else {
    var domain = 'www.leapmotion.com';
    console.log('Checking Internet connection...');
    dns.resolve(domain, function(err) {
      lastCheck = (new Date()).getTime();
      lastIsConnected = !err || (err.code !== dns.CONNREFUSED && err.code !== dns.TIMEOUT);
      console.log('Internet connection is ' + (lastIsConnected ? 'up' : 'down') + '.');
      cb && cb(lastIsConnected);
    });
  }
}

module.exports.check = checkInternetConnection;

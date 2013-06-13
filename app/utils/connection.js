var dns = require('dns');

var MinPollingIntervalMs = 5000;
var lastCheck;
var lastIsConnected;

function checkInternetConnection(cb) {
  if (lastCheck && (new Date()).getTime() - lastCheck < MinPollingIntervalMs) {
    cb && cb(lastIsConnected);
  } else {
    var domain = Math.round(Math.random() * 99999999999) + '.leapmotion.com';
    dns.resolve(domain, function(err) {
      lastCheck = (new Date()).getTime();
      lastIsConnected = !err || err.code === dns.NOTFOUND;
      console.log(lastIsConnected ? 'Internet connection is up.' : 'Internet connection is down.');
      cb && cb(lastIsConnected);
    });
  }
}

module.exports.check = checkInternetConnection;

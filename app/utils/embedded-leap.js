var os = require('os');

var db = require('./db.js');
var config = require('../../config/config.js');

var defer = $.Deferred();
var promise;

function embeddedLeapCheck() {
  if (promise) {
    return promise;
  }
  promise = defer.promise();

  var existingValue = db.fetchObj(config.DbKeys.HasEmbeddedLeapDevice);
  if (existingValue && existingValue.length) {
    defer.resolve(existingValue);
  } else {
    if (os.platform() === 'win32') {
      console.log('Checking registry for embedded leap');
      exec('reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS', function(err, stdoutBufferedResult, stderrBufferedResult) {
        var isEmbedded;
        if (err) {
          isEmbedded = false;
        } else {
          var output = stdoutBufferedResult.toString();
          // this is to detect HP pre-installed builds
          isEmbedded = /BIOSVersion\s+REG_SZ\s+B.22/.test(output) &&
            /BaseBoardManufacturer\s+REG_SZ\s+Hewlett-Packard/.test(output);
        }
        db.saveObj(config.DbKeys.HasEmbeddedLeapDevice, isEmbedded);
        defer.resolve(isEmbedded);
      });
    } else {
      db.saveObj(config.DbKeys.HasEmbeddedLeapDevice, false);
      defer.resolve(false);
    }
  }
  return promise;
}

module.exports.embeddedLeapPromise = embeddedLeapCheck;
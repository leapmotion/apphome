var exec = require('child_process').exec;
var os = require('os');

function readValue(keyName, valueName, cb) {
  if (os.platform() === 'win32') {
    exec('reg query "' + keyName + '" /v "' + valueName + '"', function(err, stdout) {
      if (/^ERROR:/.test(stdout)) {
        cb && cb(new Error(stdout));
      } else {
        var lines = stdout.replace(/^\s+|\s+$/, '').split(/\r?\n/);
        var resultParts = (lines[1] || '').replace(/^\s+|\s+$/, '').split(/\s+/);
        cb && cb(null, resultParts[2], resultParts[1]);
      }
    });
  } else {
    cb && cb(new Error('Registry access is only supported on Windows.'));
  }
}

function readFullKey(keyName, cb) {
  if (os.platform() === 'win32') {
    exec('reg query "' + keyName + '" /s', cb);
  } else {
    cb && cb(new Error('Registry access is only supported on Windows.'));
  }
}

module.exports.readValue = readValue;
module.exports.readFullKey = readFullKey;

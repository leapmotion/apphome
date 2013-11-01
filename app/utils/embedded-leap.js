var exec = require('child_process').exec;
var os = require('os');
var fs = require('fs');
var path = require('path');

var db = require('./db.js');
var config = require('../../config/config.js');

var defer = $.Deferred();
var promise;

function isLeapEmbedded() {
  if (typeof uiGlobals.isEmbedded !== 'undefined') {
    return uiGlobals.isEmbedded;
  }

  var existingValue = db.fetchObj(config.DbKeys.HasEmbeddedLeapDevice);
  if (typeof existingValue !== 'undefined') {
    return existingValue;
  }

  var isEmbedded = false;
  if (os.platform() === 'win32') {
    try {
      // look for the file named 'installtype' in PlatformProgramDataDir
      var dirs = config.PlatformProgramDataDirs[os.platform()];
      dirs.push('installtype');
      var baseDir = path.join.apply(path, dirs);
      if (!fs.existsSync(baseDir)) {
        console.log('Device type data not found, assuming peripheral');
      } else {
        var devicetype = fs.readFileSync(baseDir).toString();
        if (!devicetype) {
          console.error('Unable to read Device type data');
        } else {
          console.log('Device type: ' + devicetype);
          isEmbedded = (devicetype === "pongo" || devicetype === "hops");
        }
      }
    } catch(err) {
      console.error('Error reading installtype: ' + err);
    }
  }
  db.saveObj(config.DbKeys.HasEmbeddedLeapDevice, isEmbedded);
  return isEmbedded;
}

module.exports.isLeapEmbedded = isLeapEmbedded;

var exec = require('child_process').exec;
var os = require('os');
var fs = require('fs');
var path = require('path');

var db = require('./db.js');
var config = require('../../config/config.js');

var defer = $.Deferred();
var promise;


// Returns embedded type if type matches config.EmbeddedLeapTypes (e.g. pongo, hops)
// Returns undefined if no embedded device
function getEmbeddedDevice() {
  if (typeof uiGlobals.embeddedDevice !== 'undefined') {
    return uiGlobals.embeddedDevice;
  }

  var existingValue = db.fetchObj(config.DbKeys.HasEmbeddedLeapDevice);
  if (typeof existingValue !== 'undefined') {
    return existingValue;
  }

  var embeddedDevice;
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
          if (config.EmbeddedLeapTypes.indexof(devicetype)) {
            embeddedDevice = devicetype;
          }
        }
      }
    } catch(err) {
      console.error('Error reading installtype: ' + err);
    }
  }
  db.saveObj(config.DbKeys.HasEmbeddedLeapDevice, embeddedDevice);
  return embeddedDevice;
}

module.exports.getEmbeddedDevice = getEmbeddedDevice;

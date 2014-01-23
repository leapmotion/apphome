// Generated by CoffeeScript 1.6.3
(function() {
  var config, db, defer, exec, fs, getEmbeddedDevice, mixpanel, os, path, promise;

  exec = require("child_process").exec;

  os = require("os");

  fs = require("fs");

  path = require("path");

  db = require("./db.js");

  config = require("../../config/config.js");

  mixpanel = require("./mixpanel.js");

  defer = $.Deferred();

  promise = void 0;

  getEmbeddedDevice = function() {
    var baseDir, devicetype, dirs, embeddedDevice, err, existingValue;
    if (config.EmbeddedLeapTypes.indexOf(uiGlobals.embeddedDevice) !== -1) {
      return uiGlobals.embeddedDevice;
    }
    existingValue = db.fetchObj(config.DbKeys.EmbeddedLeapDevice);
    if (typeof existingValue !== "undefined") {
      return existingValue;
    }
    embeddedDevice = void 0;
    if (os.platform() === "win32") {
      try {
        dirs = config.PlatformProgramDataDirs[os.platform()];
        dirs.push("installtype");
        baseDir = path.join.apply(path, dirs);
        if (!fs.existsSync(baseDir)) {
          console.log("Device type data not found, assuming peripheral");
        } else {
          devicetype = fs.readFileSync(baseDir).toString();
          if (!devicetype) {
            console.error("Unable to read Device type data");
          } else {
            console.log("Device type: " + devicetype);
            if (config.EmbeddedLeapTypes.indexOf(devicetype) !== -1) {
              embeddedDevice = devicetype;
              mixpanel.trackEvent("Embedded Leap Motion Controller Detected", {
                deviceType: embeddedDevice
              });
            }
          }
        }
      } catch (_error) {
        err = _error;
        console.error("Error reading installtype: " + err);
      }
    }
    db.saveObj(config.DbKeys.EmbeddedLeapDevice, embeddedDevice);
    return embeddedDevice;
  };

  module.exports.getEmbeddedDevice = getEmbeddedDevice;

}).call(this);

/*
//@ sourceMappingURL=embedded-leap.map
*/

// Generated by CoffeeScript 1.7.1
(function() {
  var exec, os, readFullKey, readValue;

  exec = require("child_process").exec;

  os = require("os");

  readValue = function(keyName, valueName, cb) {
    if (os.platform() === "win32") {
      return exec("reg query \"" + keyName + "\" /v \"" + valueName + "\"", function(err, stdout) {
        var lines, resultParts;
        if (/^ERROR:/.test(stdout)) {
          return typeof cb === "function" ? cb(new Error(stdout)) : void 0;
        } else {
          lines = stdout.replace(/^\s+|\s+$/, "").split(/\r?\n/);
          resultParts = (lines[1] || "").replace(/^\s+|\s+$/, "").split(/\s+/);
          return typeof cb === "function" ? cb(null, resultParts[2], resultParts[1]) : void 0;
        }
      });
    } else {
      return typeof cb === "function" ? cb(new Error("Registry access is only supported on Windows.")) : void 0;
    }
  };

  readFullKey = function(keyName, cb) {
    if (os.platform() === "win32") {
      return exec("reg query \"" + keyName + "\" /s", {
        maxBuffer: 1000 * 1024
      }, cb);
    } else {
      return typeof cb === "function" ? cb(new Error("Registry access is only supported on Windows.")) : void 0;
    }
  };

  module.exports.readValue = readValue;

  module.exports.readFullKey = readFullKey;

}).call(this);

// Generated by CoffeeScript 1.6.3
(function() {
  var convertToPng, exec, os, path, shell;

  os = require("os");

  exec = require("child_process").exec;

  path = require("path");

  shell = require("./shell.js");

  convertToPng = function(inputBinary, outputPng, cb) {
    if (os.platform() !== "win32") {
      return cb(new Error("ico conversion is only supported on Windows"));
    }
    return exec(shell.escape(path.join(__dirname, "..", "..", "bin", "IconExtractor.exe")) + " " + shell.escape(inputBinary) + " " + shell.escape(outputPng), cb);
  };

  module.exports.convertToPng = convertToPng;

}).call(this);

/*
//@ sourceMappingURL=ico.map
*/

// Generated by CoffeeScript 1.6.3
(function() {
  var exec, fs, os, parse, parseFile, plist, shell;

  exec = require("child_process").exec;

  fs = require("fs");

  os = require("os");

  plist = require("plist");

  shell = require("./shell.js");

  parseFile = function(plistPath, cb) {
    var parseResult;
    parseResult = function(err, result) {
      var err2;
      if (err) {
        return cb && cb(err);
      }
      try {
        return cb && cb(null, parse(result.toString()));
      } catch (_error) {
        err2 = _error;
        return cb && cb(err2);
      }
    };
    if (os.platform() === "darwin") {
      return exec("plutil -convert xml1 -o - " + shell.escape(plistPath), parseResult);
    } else {
      return fs.readFile(plistPath, parseResult);
    }
  };

  parse = function(rawPlist) {
    return plist.parseStringSync(rawPlist);
  };

  module.exports.parseFile = parseFile;

  module.exports.parse = parse;

}).call(this);

/*
//@ sourceMappingURL=plist.map
*/

// Generated by CoffeeScript 1.7.1
(function() {
  var config, consoleLog, fs, getLogContents, getLogger, isProduction, log, logStream, os, path, pathToLog;

  fs = require("fs");

  path = require("path");

  os = require("os");

  config = require("../../config/config.js");

  isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);

  pathToLog = path.join(config.PlatformDirs[os.platform()], 'Airspace', 'log.txt');

  if ((fs.existsSync(pathToLog)) && (/\n(WARN|ERROR)/g.test(fs.readFileSync(pathToLog, {
    encoding: 'utf8'
  })))) {
    console.log("Saving previous log");
    fs.renameSync(pathToLog, pathToLog + '.' + Date.now());
  }

  logStream = fs.createWriteStream(path.join(pathToLog));

  consoleLog = console.log.bind(console);

  log = function(message) {
    consoleLog(message);
    return logStream.write(message + "\r\n", "utf-8");
  };

  process.on("exit", function() {
    return logStream.close();
  });

  getLogContents = function(cb) {
    return logStream.close(function() {
      var content;
      content = fs.readFileSync(pathToLog, {
        encoding: 'utf8'
      });
      return cb(content);
    });
  };

  getLogger = function(level) {
    level = level || "log";
    return function() {
      var sourceFile, str;
      sourceFile = ((new Error()).stack.split("\n")[2] || "").replace(/^\s+|\s+$/g, "");
      str = level.toUpperCase() + " (" + Date.now() % 10000 + "): " + Array.prototype.slice.call(arguments).map(function(arg) {
        var e;
        try {
          return (typeof arg === "object" ? JSON.stringify(arg) : String(arg));
        } catch (_error) {
          e = _error;
          return String(arg);
        }
      }).join(" ") + " (" + sourceFile + ")";
      return log(str);
    };
  };

  console.log = window.console.log = getLogger("log");

  console.debug = window.console.debug = getLogger("debug");

  console.info = window.console.info = getLogger("info");

  console.warn = window.console.warn = getLogger("warn");

  console.error = window.console.error = getLogger("error");

  module.exports.getLogContents = getLogContents;

}).call(this);

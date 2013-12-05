// Generated by CoffeeScript 1.6.3
(function() {
  var config, fs, getLogger, isProduction, log, logStream, os, path;

  fs = require("fs");

  path = require("path");

  os = require("os");

  config = require("../../config/config.js");

  log = void 0;

  isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);

  if (!isProduction) {
    log = console.log.bind(console);
  } else {
    logStream = fs.createWriteStream(path.join(config.PlatformDirs[os.platform()], "Airspace", "log.txt"));
    log = function(message) {
      return logStream.write(message + "\r\n", "utf-8");
    };
    process.on("exit", function() {
      return logStream.close();
    });
  }

  getLogger = function(level) {
    level = level || "log";
    return function() {
      var sourceFile, str;
      sourceFile = ((new Error()).stack.split("\n")[2] || "").replace(/^\s+|\s+$/g, "");
      str = level.toUpperCase() + " (" + uiGlobals.appVersion + "): " + Array.prototype.slice.call(arguments_).map(function(arg) {
        var e;
        try {
          return (typeof arg === "object" ? JSON.stringify(arg) : String(arg));
        } catch (_error) {
          e = _error;
          return String(arg);
        }
      }).join(" ") + " (" + sourceFile + ")";
      log(str);
      if (isProduction && (level === "warn" || level === "error")) {
        return window.Raven.captureMessage(str);
      }
    };
  };

  console.log = window.console.log = getLogger("log");

  console.debug = window.console.debug = getLogger("debug");

  console.info = window.console.info = getLogger("info");

  console.warn = window.console.warn = getLogger("warn");

  console.error = window.console.error = getLogger("error");

}).call(this);

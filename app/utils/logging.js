var fs = require('fs');
var path = require('path');
var os = require('os');

var config = require('../../config/config.js');

var log;

if (process.env.LEAPHOME_ENV === 'development') {
  log = console.error.bind(console);
} else {
  var logStream = fs.createWriteStream(path.join(config.PlatformDirs[os.platform()], uiGlobals.appName, 'log.txt'));
  log = function(message) {
    logStream.write(message + '\r\n', 'utf-8');
  };
  process.on('exit', function() {
    logStream.close();
  });
}

function getLogger(level) {
  level = level || 'log';
  return function() {
    log(level.toUpperCase() + ': ' + Array.prototype.slice.call(arguments).map(function(arg) {
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' '));
  }
}

console.log = getLogger('log');
console.debug = getLogger('debug');
console.info = getLogger('info');
console.warn = getLogger('warn');
console.error = getLogger('error');

var fs = require('fs');
var path = require('path');
var os = require('os');

var config = require('../../config/config.js');

var log;

var isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);

if (/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
  log = console.log.bind(console);
} else {
  var logStream = fs.createWriteStream(path.join(config.PlatformDirs[os.platform()], 'Airspace', 'log.txt'));
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
    var sourceFile = ((new Error()).stack.split('\n')[2] || '').replace(/^\s+|\s+$/g, '');
    var str = level.toUpperCase() + ' (' + uiGlobals.appVersion + '): ' + Array.prototype.slice.call(arguments).map(function(arg) {
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch(e) {
        return String(arg);
      }
    }).join(' ') + ' (' + sourceFile + ')';
    log(str);
    if (isProduction && (level === 'warn' || level === 'error')) {
      window.Raven.captureMessage(str);
    }
  };
}

console.log = window.console.log = getLogger('log');
console.debug = window.console.debug = getLogger('debug');
console.info = window.console.info = getLogger('info');
console.warn = window.console.warn = getLogger('warn');
console.error =window.console.error =  getLogger('error');

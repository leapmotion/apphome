var config = require('../config/config.js');
var installManager = require('./utils/install-manager.js');
var logging = require('./utils/logging.js');

var startup = require('./startup.js');
var crashCounter = require('./utils/crash-counter.js');

var IgnoredErrorRegex = /ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEOUT|ETIMEDOUT|ENOTFOUND/;


function run() {
  startup.run();
}

process.on('uncaughtException', function(err) {
  var isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);
  if (IgnoredErrorRegex.test(err.code) || IgnoredErrorRegex.test(err.message)) {
    console.log('Ignoring uncaught network exception: ' + (err.stack || err));
    return;
  }

  if (isProduction) {
    try {
      logging.getLogContents(function(data) {
        var lines = data.substring(data.length-1800, data.length-1);
        window.Raven.captureMessage((err.stack || JSON.stringify(err)) + "\n\nlog.txt:\n\n" + lines);
      });
    } catch(e){console.log(e);}
  }

  installManager.cancelAll();

  setTimeout(function() {
    if (crashCounter.count() <= 2) {
      crashCounter.increment();
      process.exit();
    } else {
      if (isProduction) {
        window.localStorage.clear();
      }
      process.exit();
    }
  }, 1000);
});


exports.run = run;


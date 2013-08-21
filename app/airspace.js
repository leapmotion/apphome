var config = require('../config/config.js');
var installManager = require('./utils/install-manager.js');

var bootstrapController = require('./bootstrap-controller.js');
var crashCounter = require('./utils/crash-counter.js');

var IgnoredErrorRegex = /ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEOUT|ETIMEDOUT|ENOTFOUND/;


function run() {
  bootstrapController.run();
}

process.on('uncaughtException', function(err) {
  if (IgnoredErrorRegex.test(err.code) || IgnoredErrorRegex.test(err.message)) {
    console.log('Ignoring uncaught network exception: ' + (err.stack || err));
    return;
  }

  console.error('Uncaught exception: ' + (err.stack || err));
  installManager.cancelAll();
  var isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);

  if (isProduction) {
    window.Raven.captureError(err);
  }
  if (crashCounter.count() <= 2) {
    crashCounter.increment();
    process.exit();
  } else {
    if (isProduction) {
      window.localStorage.clear();
    }
    process.exit();
  }
});


exports.run = run;


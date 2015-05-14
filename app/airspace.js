var config = require('../config/config.js');
var installManager = require('./utils/install-manager.js');
var logging = require('./utils/logging.js');
var i18n = require('./utils/i18n.js');

var startup = require('./startup.js');
var crashCounter = require('./utils/crash-counter.js');

var IgnoredErrorRegex = /ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEOUT|ETIMEDOUT|ENOTFOUND/;


function run() {
  startup.run();
}

process.on('uncaughtException', function(err) {
  var isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV) && /-/.test(uiGlobals.appVersion); // example release version: 2.1.3-42fd17
  if (IgnoredErrorRegex.test(err.code) || IgnoredErrorRegex.test(err.message)) {
    console.log('Ignoring uncaught network exception: ' + (err.stack || err));
    return;
  }

  if (/ENOSPC/.test(err.code) || /ENOSPC/.test(err.message)) {
    window.alert(i18n.translate('Disk full.'));
    return;
  }

  installManager.cancelAll();

  var errormsg = (err.stack || JSON.stringify(err));
  console.log('closing the app');
  console.log(errormsg);
  if (isProduction) {
    try {
      logging.getLogContents(function(data) {
        var lines = data.substring(data.length-1000, data.length-1);
        window.Raven.captureMessage("Crash report in " + uiGlobals.appVersion+ "\n\n" + lines + "\n..until..\n" + errormsg, {
          tags: {
            userId: uiGlobals.user_id,
            appVersion: uiGlobals.appVersion,
            embeddedDevice: uiGlobals.embeddedDevice
          }
        });
      });
    } catch(e){console.log(e);}
  }

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
  }, 1400);
});


exports.run = run;


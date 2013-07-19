var config = require('../config/config.js');
var installManager = require('./utils/install-manager.js');
var client;

var bootstrapController = require('./bootstrap-controller.js');
var mixpanel = require('./utils/mixpanel.js');
var crashCounter = require('./utils/crash-counter.js');

var IgnoredErrorRegex = /ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEOUT|ETIMEDOUT|ENOTFOUND/;

mixpanel.trackOpen();

function run() {
  bootstrapController.run();
}

// This code redirects links in app description/changelog
// markdown to open in the default browser, instead of
// trying to open in node-webkit.
$('body').on('click', 'a', function(evt) {
  evt.preventDefault();
  var href = $(this).attr('href');
  if (href) {
    nwGui.Shell.openExternal(href);
  }
});

process.on('uncaughtException', function(err) {
  if (IgnoredErrorRegex.test(err.code) || IgnoredErrorRegex.test(err.message)) {
    console.warn('Ignoring uncaught network exception: ' + (err.stack || err));
    return;
  }

  console.error('Uncaught exception: ' + (err.stack || err));
  installManager.cancelAll();
  var isProduction = !/^(development|test)$/.test(process.env.LEAPHOME_ENV);

  if (isProduction) {
    if (!client) {
      client = new require('raven').Client(config.SentryDSN);
    }
    client.captureError(err);
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

nwGui.Window.get().on('close', function() {
  this.hide();
  this.close(true);
  process.exit();
});

process.on('exit', mixpanel.trackClose);

exports.run = run;


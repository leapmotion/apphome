raven = require('raven');
var config = require('../config/config.js');
var installManager = require('./utils/install-manager.js');
var client = new raven.Client(config.SentryDSN);

var AppController = require('./app-controller.js');
var mixpanel = require('./utils/mixpanel.js');

mixpanel.trackOpen();

function run(recoveringFromError) {
  var appController = new AppController();
  if (!recoveringFromError) {
    appController.restoreModels();
  }
  appController.runApp();
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
  installManager.cancelAll();
  if (!/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
    client.captureError(err);
  }
  console.error('Uncaught exception: ' + err.stack);
  $('body').empty();
  run(true);
});

nwGui.Window.get().on('close', function() {
  this.hide();
  this.close(true);
  process.exit();
});

process.on('exit', mixpanel.trackClose);

exports.run = run;


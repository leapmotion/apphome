var AppController = require('./app-controller.js');

function run(firstRun) {
  var appController = new AppController();
  if (firstRun) {
    appController.restoreModels();
    appController.setupWindow();
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
  console.error('Uncaught exception: ' + err.stack);
  $('body').empty();
  run();
});

exports.run = run;

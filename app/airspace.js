var AppController = require('./app-controller.js');

function run(firstRun) {
  var appController = new AppController();
  if (firstRun) {
    appController.restoreModels();
    appController.setupWindow();
  }
  appController.runApp();
}

$('body').on('click', 'a', function(evt) {
  evt.preventDefault();
  nwGui.Shell.openExternal($(this).attr('href'));
});

process.on('uncaughtException', function(err) {
  console.error('Uncaught exception: ' + err.stack);
  $('body').empty();
  run();
});

exports.run = run;

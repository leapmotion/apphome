var AppController = require('./app-controller.js');

function run(firstRun) {
  var appController = new AppController();
  if (firstRun) {
    appController.setupWindow();
    appController.restoreModels();
  }
  appController.runApp();
}

process.on('uncaughtException', function(err) {
  console.error('Uncaught exception: ' + err.stack);
  $('body').empty();
  run();
});

exports.run = run;

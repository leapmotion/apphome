global.uiGlobals = require('./ui-globals.js');
var AppController = require('./app-controller.js');

function run(firstRun) {
  var appController = new AppController();
  if (firstRun) {
    appController.setupWindow();
    appController.restoreModels();
  }
  appController.runApp();
}

$(window).load(function() {
  run(true);
});

process.on('uncaughtException', function(err) {
  console.error('Uncaught exception: ' + err.stack);
  $('body').empty();
  run();
});



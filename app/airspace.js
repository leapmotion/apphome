global.uiGlobals = require('./ui-globals.js');
var AppController = require('./app-controller.js');

$(window).load(function() {
  var appController = new AppController();
  appController.setupWindow();
  appController.restoreModels();
  appController.runApp();
});

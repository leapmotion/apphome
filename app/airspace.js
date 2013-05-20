global.uiGlobals = require('./ui-globals.js');
var AppController = require('./app-controller.js');

$(window).load(function() {
  nwGui.Window.get().maximize();
  var appController = new AppController();
  appController.runApp();
});

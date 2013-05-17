var fs = require('fs');
var path = require('path');
var PageContainerView = require('./views/page-container/page-container.js');
var uiGlobals = require('./ui-globals.js');
var LeapAppCollection = require('./models/leap-app-collection.js');
var LeapApp = require('./models/leap-app.js');
var BuiltinTileApp = require('./models/builtin-tile-app.js');

function AppController() {
}

AppController.prototype = {

  runApp: function() {
    this._setupGlobals();
    this._paintPage();
    this._initializeState();
  },

  _setupGlobals: function() {
    global.uiGlobals = uiGlobals;
    global.CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'config.json'), 'utf-8'));
    uiGlobals.leapApps = new LeapAppCollection();
  },

  _paintPage: function() {
    $('body').append((new PageContainerView()).$el);
  },

  _initializeState: function() {
    BuiltinTileApp.createBuiltinTiles();
    LeapApp.hydrateCachedModels();
  }

};

var appController;

$(window).load(function() {
  appController = new AppController();
  appController.runApp();
});

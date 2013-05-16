var PageContainerView = require('./views/page-container/page-container.js');
var uiGlobals = require('./ui-globals.js');
var LeapAppCollection = require('./models/leap-app-collection.js');
var LeapApp = require('./models/leap-app.js');
var BuiltinTileApp = require('./models/builtin-tile-app.js');

$(window.document).ready(function() {
  global.uiGlobals = uiGlobals;
  uiGlobals.leapApps = new LeapAppCollection();
  $('body').append((new PageContainerView()).$el);
  BuiltinTileApp.createBuiltinTiles();
  LeapApp.hydrateCachedModels();
});

var enumerable = require('./utils/enumerable.js');

var LeapAppCollection = require('./models/leap-app-collection.js');

var uiGlobals = _.extend({}, window.Backbone.Events);

uiGlobals.Event = enumerable.make([
  'SplashWelcomeClosed',
  'GotoInstalledAppsCarousel',
  'GotoUpdateAppsCarousel',
  'GotoDeletedAppsCarousel',
  'DiskWriteError'
], 'UiGlobalEvent');


uiGlobals.Builtin = enumerable.make([
  'VisitStore',
  'ErrorTile'
], 'Builtins');

uiGlobals.leapApps = new LeapAppCollection();

module.exports = uiGlobals;

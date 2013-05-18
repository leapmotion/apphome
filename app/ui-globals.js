var enumerable = require('./utils/enumerable.js');

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

module.exports = uiGlobals;

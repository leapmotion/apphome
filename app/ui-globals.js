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

uiGlobals.leapApps = new LeapAppCollection();

module.exports = uiGlobals;

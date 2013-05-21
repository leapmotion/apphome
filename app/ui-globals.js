var enumerable = require('./utils/enumerable.js');

var LeapAppCollection = require('./models/leap-app-collection.js');

var uiGlobals = _.extend({}, window.Backbone.Events);

uiGlobals.Event = enumerable.make([
  'SplashWelcomeClosed',
  'GotoInstalledAppsCarousel',
  'GotoUpgradeCarousel',
  'GotoTrashCarousel',
  'DiskWriteError'
], 'UiGlobalEvent');

uiGlobals.installedApps = new LeapAppCollection();
uiGlobals.uninstalledApps = new LeapAppCollection();
uiGlobals.availableUpgrades = new LeapAppCollection();

uiGlobals.scaling = 1;

module.exports = uiGlobals;

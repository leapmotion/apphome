var fs = require('fs');
var path = require('path');

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
uiGlobals.availableDownloads = new LeapAppCollection();

uiGlobals.scaling = 1;

uiGlobals.appName = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'))).name;

module.exports = uiGlobals;

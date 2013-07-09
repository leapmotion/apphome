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

uiGlobals.myApps = new LeapAppCollection();
uiGlobals.uninstalledApps = new LeapAppCollection();

uiGlobals.scaling = 1;

var packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));
uiGlobals.appName = packageJson.fullName;
uiGlobals.appVersion = packageJson.version;

uiGlobals.sendNotification = function(header, body, icon) {
  var win = nwGui.Window.get();
  window.LOCAL_NW.desktopNotifications.notify(icon || '', header, body, function() {
    win.focus();
  });
};

module.exports = uiGlobals;

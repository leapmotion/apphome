var fs = require('fs');
var path = require('path');

var enumerable = require('./utils/enumerable.js');

var LeapAppCollection = require('./models/leap-app-collection.js');

// window.require is ugly but necessary according to https://github.com/rogerwang/node-webkit/issues/226
var gui = window.require('nw.gui');

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

uiGlobals.sendNotification = function(header, body, icon) {
  var win = gui.Window.get();
  window.LOCAL_NW.desktopNotifications.notify(icon || '', header, body, function() {
    win.focus();
    win.restore();
  });
};

module.exports = uiGlobals;

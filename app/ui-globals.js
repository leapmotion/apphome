var fs = require('fs');
var path = require('path');

var config = require('../config/config.js');
var db = require('./utils/db.js');
var enumerable = require('./utils/enumerable.js');

var LeapAppCollection = require('./models/leap-app-collection.js');

var uiGlobals = _.extend({}, window.Backbone.Events);

uiGlobals.Event = enumerable.make([
  'SignIn'
], 'UiGlobalEvent');

uiGlobals.myApps = new LeapAppCollection();

uiGlobals.bootstrapPromises = {};

uiGlobals.scaling = 1;

var packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));
uiGlobals.appName = packageJson.fullName;
uiGlobals.appVersion = packageJson.version;

var po2json = require('po2json');
var language = window.navigator.language;
var transJson = '';
try {
  transJson = po2json.parseSync(path.join(__dirname, '../config/locales', language + '.po'));
} catch (e) {
  // fall back to en-US
  console.warn('Failed to find translation file for language', language);
  language = 'en-US';
  transJson = po2json.parseSync(path.join(__dirname, '../config/locales', language + '.po'));
}

var Jed = require('jed');
global.i18n = uiGlobals.i18n = new Jed({
  "domain": language,
  "missing_key_callback" : function(key) {
    console.warn('Missing translation key', key, 'for language', language);
  },
  locale_data: transJson
});

uiGlobals.sendNotification = function(header, body, icon) {
  var win = nwGui.Window.get();
  window.LOCAL_NW.desktopNotifications.notify(icon || '', header, body, function() {
    win.focus();
  });
};

module.exports = uiGlobals;

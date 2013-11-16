var fs = require('fs');
var os = require('os');

var config = require('../../config/config.js');
var db = require('./db.js');
var registry = require('./registry.js');

function initialize(cb) {
  var mixpanelDistinctId = db.getItem(config.DbKeys.MixpanelDistinctId);
  function identifyIfPossible() {
    if (mixpanelDistinctId) {
      console.log('Using Mixpanel Distinct Id: ' + mixpanelDistinctId);
      db.setItem(config.DbKeys.MixpanelDistinctId, mixpanelDistinctId);
      window.mixpanel.identify(mixpanelDistinctId);
    } else {
      console.log('Auto-generating Mixpanel Distinct Id');
    }
    cb && cb(null);
  }

  if (mixpanelDistinctId) {
    identifyIfPossible();
  } else {
    if (os.platform() === 'win32') {
      var registryKey = (process.env.ProgramW6432 ? 'HKLM\\Software\\Wow6432Node\\LeapMotion' : 'HKLM\\Software\\LeapMotion');
      registry.readValue(registryKey, 'MixPanelGUID', function(err, idFromRegistry) {
        if (!err) {
          mixpanelDistinctId = idFromRegistry;
        }
        identifyIfPossible();
      });
    } else if (os.platform() === 'darwin') {
      fs.readFile('/Library/Application Support/Leap Motion/mpguid', { encoding: 'utf-8' }, function(err, idFromFile) {
        if (!err) {
          mixpanelDistinctId = idFromFile;
        }
        identifyIfPossible();
      });
    } else {
      identifyIfPossible();
    }
  }
}

function getTrackFn(eventName, namespace) {
  return function(args) {
    if (!/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
      console.log('Tracking Mixpanel event: ' + eventName);
      namespace = namespace || uiGlobals.appName;
      window.mixpanel.track(namespace + ' - ' + eventName, _.extend({
        version: uiGlobals.appVersion,
        embeddedDevice: uiGlobals.embeddedDevice
      }, args));
    } else {
      console.log('Would have tracked Mixpanel event in a release build: ' + eventName);
    }
  };
}

module.exports = {
  initialize: initialize,
  trackOpen: getTrackFn('Launched'),
  trackClose: getTrackFn('Closed Airspace'),
  trackSignUp: getTrackFn('Signed Up'),
  trackSignIn: getTrackFn('Signed In'),
  trackAppUpgrade: getTrackFn('Started App Update'),
  trackAppUninstall: getTrackFn('App Uninstalled Successfully'),
  trackAppReinstall: getTrackFn('Reinstalling App'),
  trackEvent: function(eventName, args, namespace) {
    (getTrackFn(eventName, namespace))(args);
  }
};

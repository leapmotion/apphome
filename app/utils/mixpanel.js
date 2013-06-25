var Mixpanel = require('mixpanel');

var config = require('../../config/config.js');

var mixpanel = Mixpanel.init(config.MixpanelToken);

function getTrackFn(eventName) {
  return function() {
    if (!/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
      console.log('Tracking Mixpanel event: ' + eventName);
      mixpanel.track(uiGlobals.appName + ' - ' + eventName, {
        version: uiGlobals.appVersion
      });
    }
  }
}

module.exports = {
  trackOpen: getTrackFn('Open'),
  trackClose: getTrackFn('Close'),
  trackSignUp: getTrackFn('Sign Up'),
  trackSignIn: getTrackFn('Sign In'),
  getTrackFn: getTrackFn
};

var Mixpanel = require('mixpanel');

var config = require('../../config/config.js');

var mixpanel = Mixpanel.init(config.MixpanelToken);

function getTrackFn(eventName) {
  return function() {
    console.log('Tracking Mixpanel event: ' + eventName);
    if (process.env.LEAPHOME_ENV !== 'test') {
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

var domain = require('domain');
var Mixpanel = require('mixpanel');

var config = require('../../config/config.js');

var mixpanelDomain = domain.create();
mixpanelDomain.on('error', function(err) {
  console.error('Error tracking Mixpanel event: ' + (err.stack || err));
});

var mixpanel;

mixpanelDomain.run(function() {
  mixpanel = Mixpanel.init(config.MixpanelToken);
});

function getTrackFn(eventName) {
  return function() {
    if (!/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
      console.log('Tracking Mixpanel event: ' + eventName);
      mixpanelDomain.run(function() {
        mixpanel.track(uiGlobals.appName + ' - ' + eventName, {
          version: uiGlobals.appVersion
        });
      });
    } else {
      console.log('Would have tracked Mixpanel event in a release build: ' + eventName);
    }
  }
}

module.exports = {
  trackOpen: getTrackFn('Launched'),
  trackClose: getTrackFn('Closed Airspace'),
  trackSignUp: getTrackFn('Signed Up'),
  trackSignIn: getTrackFn('Signed In'),
  trackAppUpgrade: getTrackFn('Started App Update'),
  trackEvent: function(eventName) {
    (getTrackFn(eventName))();
  }
};

var Mixpanel = require('mixpanel');

var config = require('../../config/config.js');

var mixpanel = Mixpanel.init(config.MixpanelToken);

function getTrackFn(eventName) {
  return function() {
    console.log('Tracking Mixpanel event: ' + eventName);
    mixpanel.track(uiGlobals.appName + ' - ' + eventName, {
      version: uiGlobals.appVersion
    });
  }
}

module.exports = {
  trackOpen: getTrackFn('Open'),
  trackClose: getTrackFn('Close'),
  trackAirspaceStoreTileClick: getTrackFn('Click Airspace Store Tile'),
  trackCommunityTileClick: getTrackFn('Click Leap Community Tile'),
  trackSignUp: getTrackFn('Sign Up'),
  trackSignIn: getTrackFn('Sign In')
};

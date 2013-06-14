var Mixpanel = require('mixpanel');

var mixpanel = Mixpanel.init(config.MixpanelToken);

function getTrackFn(eventName) {
  return function() {
    mixpanel.track(eventName, {
      version: uiGlobals.appVersion
    });
  }
}

module.exports = {
  trackOpen: getTrackFn('Open Airspace Home'),
  trackClose: getTrackFn('Close Airspace Home'),
  trackAirspaceStoreTileClick: getTrackFn('Click Airspace Store Tile'),
  trackCommunityTileClick: getTrackFn('Click Leap Community Tile'),
  trackSignUp: getTrackFn('Sign Up from Airspace Home'),
  trackSignIn: getTrackFn('Sign In from Airspace Home')
};

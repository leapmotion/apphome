function getTrackFn(eventName, namespace) {
  return function(args) {
    if (!/^(development|test)$/.test(process.env.LEAPHOME_ENV)) {
      console.log('Tracking Mixpanel event: ' + eventName);
      namespace = namespace || uiGlobals.appName;
      window.mixpanel.track(namespace + ' - ' + eventName, _.extend({
        version: uiGlobals.appVersion
      }, args));
    } else {
      console.log('Would have tracked Mixpanel event in a release build: ' + eventName);
    }
  };
}

module.exports = {
  trackOpen: getTrackFn('Launched'),
  trackClose: getTrackFn('Closed Airspace'),
  trackSignUp: getTrackFn('Signed Up'),
  trackSignIn: getTrackFn('Signed In'),
  trackAppUpgrade: getTrackFn('Started App Update'),
  trackEvent: function(eventName, args, namespace) {
    (getTrackFn(eventName, namespace))(args);
  }
};

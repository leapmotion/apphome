var crypto = require('crypto');

var api = require('../utils/api.js');
var config = require('../../config/config.js');
var mixpanel = require('../utils/mixpanel.js');

var LeapApp = require('./leap-app.js');

var WebLinkApp = LeapApp.extend({

  constructor: function(args) {
    args = args || {};
    args.state = LeapApp.States.Ready;

    var md5hash = crypto.createHash('md5');
    md5hash.update(args.urlToLaunch);
    args.id = md5hash.digest('hex');

    LeapApp.prototype.constructor.call(this, args);
  },

  isBuiltinTile: function() {
    return !this.get('deletable');
  },

  isWebLinkApp: function() {
    return true;
  },

  launch: function() {
    var url = this.get('urlToLaunch');
    if (this.get('passAccessToken')) {
      api.getAuthURL(url, function(err, authURL) {
        if (err) {
          console.log('error getting an authenticated URL', err);
          nwGui.Shell.openExternal(url);
        } else {
          nwGui.Shell.openExternal(authURL);
        }
      });
    } else {
      nwGui.Shell.openExternal(url);
    }

    var eventToTrack = this.get('eventToTrack');
    if (eventToTrack) {
      var trackFn = mixpanel.getTrackFn(eventToTrack);
      trackFn();
    }
  }

});

module.exports = WebLinkApp;

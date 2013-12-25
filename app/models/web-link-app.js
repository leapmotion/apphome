var crypto = require('crypto');
var qs = require('querystring');

var api = require('../utils/api.js');
var config = require('../../config/config.js');
var mixpanel = require('../utils/mixpanel.js');
var oauth = require('../utils/oauth.js');

var LeapApp = require('./leap-app.js');

var WebLinkApp = LeapApp.extend({
  className: 'WebLinkApp',

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
    var urlToLaunch = this.get('urlToLaunch');
    if (this.get('passAccessToken')) {
      oauth.getAccessToken(function(err, accessToken) {
        if (!err) {
          urlToLaunch = config.AuthWithAccessTokenUrl + '?' + qs.stringify({ access_token: accessToken, _r: urlToLaunch });
        }
        nwGui.Shell.openExternal(urlToLaunch);
      });
    } else {
      nwGui.Shell.openExternal(urlToLaunch);
    }

    var eventToTrack = this.get('eventToTrack');
    if (eventToTrack) {
      mixpanel.trackEvent(eventToTrack);
    }
  }

});

module.exports = WebLinkApp;

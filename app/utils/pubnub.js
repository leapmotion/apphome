// Generated by CoffeeScript 1.7.1
(function() {
  var config, domain, events, history, pubnub, pubnubDomain, pubnubInit, pubnubSubscriptions, subscribe, unsubscribeAll;

  config = require("../../config/config.js");

  domain = require("domain");

  events = require("events");

  window.PUBNUB = require("../../static/js/pubnub-3.5.47.min.js");

  pubnubInit = window.PUBNUB && window.PUBNUB.init;

  pubnubSubscriptions = {};

  pubnub = void 0;

  pubnubDomain = domain.create();

  pubnubDomain.on("error", function(err) {
    console.warn("PubNub error: " + (err.stack || err));
    return unsubscribeAll(true);
  });

  pubnubDomain.run(function() {
    console.log("Using PubnubSubscribeKey: " + config.PubnubSubscribeKey + " in env: " + process.env.LEAPHOME_ENV);
    if (pubnubInit) {
      return pubnub = pubnubInit({
        subscribe_key: config.PubnubSubscribeKey,
        ssl: true,
        jsonp: true
      });
    } else {
      return pubnub = {
        subscribe: function() {},
        unsubscribe: function() {}
      };
    }
  });

  unsubscribeAll = function(resubscribe) {
    var savedSubscriptions, subscribedChannels;
    subscribedChannels = Object.keys(pubnubSubscriptions);
    subscribedChannels.forEach(function(channel) {
      console.log("Unsubscribing from PubNub channel: " + channel);
      return pubnubDomain.run(function() {
        return pubnub.unsubscribe({
          channel: channel
        });
      });
    });
    if (resubscribe) {
      savedSubscriptions = pubnubSubscriptions;
      pubnubSubscriptions = {};
      return subscribedChannels.forEach(function(channel) {
        return subscribe(channel, savedSubscriptions[channel]);
      });
    } else {
      return pubnubSubscriptions = {};
    }
  };

  subscribe = function(channel, callback, options) {
    if (options == null) {
      options = {};
    }
    if (!pubnubSubscriptions[channel]) {
      pubnubSubscriptions[channel] = callback;
      pubnubDomain.run(function() {
        options.channel = channel;
        options.callback = function(data) {
          var err;
          try {
            return callback(data);
          } catch (_error) {
            err = _error;
            return console.warn("Failed to handle PubNub message on channel \"" + channel + "\": " + JSON.stringify(data) + " " + (err.stack || err));
          }
        };
        return pubnub.subscribe(options);
      });
      return true;
    } else {
      console.warn("Ignoring duplicate subscription on channel \"" + channel + "\".");
      return false;
    }
  };

  history = function(count, channel, callback) {
    return pubnubDomain.run(function() {
      return pubnub.history({
        count: count,
        channel: channel,
        callback: function(data) {
          var err;
          if (data.length !== 3) {
            return console.warn('Improper message from PubNub history:', data);
          } else {
            console.log('Found', data[0].length, 'notifications in history.');
            try {
              return callback.apply(this, data);
            } catch (_error) {
              err = _error;
              return console.warn("Failed to handle PubNub message on channel \"" + channel + "\": " + JSON.stringify(data) + " " + (err.stack || err));
            }
          }
        }
      });
    });
  };

  module.exports.domain = pubnubDomain;

  module.exports.subscribe = subscribe;

  module.exports.history = history;

  module.exports.unsubscribeAll = unsubscribeAll;

}).call(this);

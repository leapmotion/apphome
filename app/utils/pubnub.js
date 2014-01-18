var config = require('../../config/config.js');
var domain = require('domain');
var events = require('events');
var pubnubInit = window.PUBNUB && window.PUBNUB.init;


var pubnubSubscriptions = {};
var pubnub;
var pubnubDomain = domain.create();

pubnubDomain.on('error', function(err) {
  console.warn('PubNub error: ' + (err.stack || err));
  unsubscribeAll(true);
});

pubnubDomain.run(function() {
  if (pubnubInit) {
    pubnub = pubnubInit({
      subscribe_key: config.PubnubSubscribeKey,
      ssl: true,
      jsonp: true // force http transport to work better with http proxies
    });
  } else {
    // stub for tests
    pubnub = {
      subscribe: function() {},
      unsubscribe: function() {}
    };
  }
});

function unsubscribeAll(resubscribe) {
  var subscribedChannels = Object.keys(pubnubSubscriptions);
  subscribedChannels.forEach(function(channel) {
    console.log('Unsubscribing from PubNub channel: ' + channel);
    pubnubDomain.run(function() {
      pubnub.unsubscribe({ channel: channel });
    });
  });

  if (resubscribe) {
    var savedSubscriptions = pubnubSubscriptions;
    pubnubSubscriptions = {};
    subscribedChannels.forEach(function(channel) {
      subscribe(channel, savedSubscriptions[channel]);
    });
  } else {
    pubnubSubscriptions = {};
  }
}

function subscribe(channel, callback) {
  if (!pubnubSubscriptions[channel]) { // only allow one subscription per channel
    pubnubSubscriptions[channel] = callback;

    pubnubDomain.run(function() {
      pubnub.subscribe({
        channel: channel,
        callback: function(data) {
          try {
            callback(data);
          } catch (err) {
            console.warn('Failed to handle PubNub message on channel "' + channel + '": ' + data);
          }
        }
      });
    });
    return true;
  } else {
    console.warn('Ignoring duplicate subscription on channel "' + channel + '".');
    return false;
  }
}

function history(count, channel, callback) {
  pubnubDomain.run(function() {
    pubnub.history({
      count: count,
      channel: channel,
      callback: function(data) {
        if (data.length !== 3) {
          console.warn('Improper message coming back from pubnub history: ' + data);
        } else {
          console.log('History got: ' + JSON.stringify(data));

          try {
            callback.apply(this, data);
          } catch (err) {
            console.warn('Failed to handle PubNub message on channel "' + channel + '": ' + JSON.stringify(data), err && err.stack || err);
          }
        }
      }
    });
  });
}

module.exports.domain = pubnubDomain;
module.exports.subscribe = subscribe;
module.exports.history = history;
module.exports.unsubscribeAll = unsubscribeAll;

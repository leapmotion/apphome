var config = require('../../config/config.js');
var domain = require('domain');
var events = require('events');
var pubnubInit = window.PUBNUB.init;


var pubnubSubscriptions = {};
var pubnub;
var pubnubDomain = domain.create();

pubnubDomain.on('error', function(err) {
  console.warn('PubNub error: ' + (err.stack || err));
  unsubscribeAll(true);
});

pubnubDomain.run(function() {
  pubnub = pubnubInit({
    subscribe_key: config.PubnubSubscribeKey,
    ssl: true,
    jsonp: true // force http transport to work better with http proxies
  });
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

module.exports.domain = pubnubDomain;
module.exports.subscribe = subscribe;
module.exports.unsubscribeAll = unsubscribeAll;

var newApp = require('./new-app.js');
var appUpgrade = require('./app-upgrade.js');
var callbacksByChannel = {};

function subscribe(args) {
  if (callbacksByChannel[args.channel]) {
    throw new Error('Multiple subscriptions to the same channel are bad. No soup for you.');
  }
  callbacksByChannel[args.channel] = args.callback;
}

function unsubscribe(args) {
  delete callbacksByChannel[args.channel];
}

function triggerNewApp(appId) {
  Object.keys(callbacksByChannel).forEach(function(channel) {
    if (/user/.test(channel)) {
      console.log('Triggering new app on channel: ' + channel);
      callbacksByChannel[channel](JSON.stringify(newApp.withOverrides({ app_id: appId })));
    }
  });
}

function triggerAppUpgrade(appId, version) {
  Object.keys(callbacksByChannel).forEach(function(channel) {
    if ((new RegExp(appId + '\\.app')).test(channel)) {
      console.log('Triggering upgrade on channel: ' + channel);
      callbacksByChannel[channel](JSON.stringify(appUpgrade.forAppIdAndVersion(appId, version)));
    }
  });
}

module.exports.init = function() {};
module.exports.subscribe = subscribe;
module.exports.unsubscribe = unsubscribe;
module.exports.triggerNewApp = triggerNewApp;
module.exports.triggerAppUpgrade = triggerAppUpgrade;


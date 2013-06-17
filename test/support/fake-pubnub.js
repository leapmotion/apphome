var newApp = require('./new-app.js');
var appUpgrade = require('./app-upgrade.js');
var callbacksByChannel = {};

var AppId = 1;

function subscribe(args) {
  if (callbacksByChannel[args.channel]) {
    throw new Error('Multiple subscriptions to the same channel are bad. No soup for you.');
  }
  callbacksByChannel[args.channel] = args.callback;
  process.nextTick(function() {
    if (/user/.test(args.channel)) {
      args.callback(JSON.stringify(appUpgrade.forAppId(AppId)));
    } else {
      args.callback(JSON.stringify(newApp.withOverrides({ app_id: AppId })));
    }
  });
}

function unsubscribe(args) {
  delete callbacksByChannel[args.channel];
}

module.exports.init = function() {};
module.exports.subscribe = subscribe;
module.exports.unsubscribe = unsubscribe;

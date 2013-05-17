var randomValue = require('./random-value.js');

var randomInt = randomValue.randomInt;
var randomString = randomValue.randomString;

function storeAppData(args) {
  args = args || {};
  var verId = args.id || randomInt(5);
  var appId = args.app_id || randomInt(3);
  return {
    id: verId,
    app_id: appId,
    version: args.version || (randomInt(1) + '.' + randomInt(2) + '.' + randomInt(2)),
    name: args.name || (randomString(7) + ' ' + randomString(5)),
    appurl: args.appurl || ('https://dev.leapmotion.com/apps/' + verId),
    licenseurl: args.licenseurl || ('https://dev.leapmotion.com/licenses/' + verId)
  };
}

function localAppData(args) {
  args = args || {};
  var id = randomString(16);

  return {
    id: args.id || id,
    name: args.name || randomString(14)
  }
}

module.exports.storeAppData = storeAppData;
module.exports.localAppData = localAppData;
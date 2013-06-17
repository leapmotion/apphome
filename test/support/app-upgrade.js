var newApp = require('./new-app.js');

function forAppId(appId, overrides) {
  return newApp.withOverrides(_.extend({}, overrides, { app_id: appId }));
}

module.exports.forAppId = forAppId;

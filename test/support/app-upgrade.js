var newApp = require('./new-app.js');

function forAppIdAndVersion(appId, version, overrides) {
  return newApp.withOverrides(_.extend({}, overrides || {}, { app_id: appId, version_number: version }));
}

module.exports.forAppIdAndVersion = forAppIdAndVersion;

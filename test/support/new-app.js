var os = require('os');

require('../unit/env.js');

var randomValue = require('./random-value.js');

function withOverrides(overrides) {
  overrides = overrides || {};

  var appJson = {
    id: randomValue.randomInt(4),
    app_id: randomValue.randomInt(4),
    name: randomValue.randomString(16),
    platform: os.platform() === 'darwin' ? 'ox' : 'windows',
    icon_url: randomValue.randomString(16),
    tile_url: randomValue.randomString(16),
    binary_url: randomValue.randomString(16),
    version_number: [ randomValue.randomInt(1), randomValue.randomInt(1), randomValue.randomInt(1) ].join('.'),
    changelog: randomValue.randomString(16),
    certified_at: (new Date()).toString(),
    created_at: (new Date()).toString()
  }

  return _.extend({}, appJson, overrides);
}

module.exports.withOverrides = withOverrides;
module.exports.get = function() {
  return withOverrides();
}

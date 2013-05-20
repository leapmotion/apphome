var os = require('os');

var oauth = require('./oauth.js');

var StoreLeapApp = require('../models/store-leap-app.js');

// TODO: real data
var FakeServerData = require('../../test/support/fake-data/store-apps.js');
var FakeLocalAppData = require('../../test/support/fake-data/local-apps.js');

function storeApps(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      return cb(err);
    } else {
      var apps = FakeServerData.map(function(app) {
        var appJson = {
          id: app.id,
          appId: app.app_id,
          name: app.name,
          version: app.version_number,
          tileUrl: app.tile_url,
          iconUrl: app.icon_url,
          binaryUrl: app.binary.url,
          platform: (app.binary.platform === 'osx' ? 'darwin' : (app.binary.platform === 'windows' ? 'win32' : app.binary.platform))
        }
        if (appJson.platform === os.platform()) {
          return new StoreLeapApp(appJson);
        } else {
          return null;
        }
      });

      cb(null, _(apps).compact());
    }
  });
}

function localApps() {
  return FakeLocalAppData[os.platform()] || [];
}

module.exports.storeApps = storeApps;
module.exports.localApps = localApps;

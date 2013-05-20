var os = require('os');

var oauth = require('./oauth.js');

// TODO: real data
var FakeServerData = require('../../test/support/fake-data/store-apps.js');
var FakeLocalAppData = require('../../test/support/fake-data/local-apps.js');

function storeApps(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      return cb(err);
    } else {
      return cb(null, _.filter(FakeServerData, function(appJson) {
        if (appJson.binary.platform === 'windows' && os.platform() === 'win32') {
          return true;
        } else if (appJson.binary.platform === 'osx' && os.platform() === 'darwin') {
          return true;
        } else {
          return false;
        }
      }));
    }
  });
}

function localApps() {
  return FakeLocalAppData[os.platform()] || [];
}

module.exports.storeApps = storeApps;
module.exports.localApps = localApps;

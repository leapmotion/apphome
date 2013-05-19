var os = require('os');

var oauth = require('./oauth.js');

// TODO: real data
var FakeData = require('../../test/support/fake-store/store-apps.js');

function pollForData(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      return cb(err);
    } else {
      return cb(null, _.filter(FakeData, function(appJson) {
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

module.exports.pollForData = pollForData;

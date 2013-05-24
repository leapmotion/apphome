var http = require('http');
var https = require('https');
var os = require('os');

var config = require('../../config/config.js');
var oauth = require('./oauth.js');

var StoreLeapApp = require('../models/store-leap-app.js');

// TODO: real data
var FakeLocalAppData = require('../../config/local-apps.js');

function storeApps(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      return cb(err);
    } else {
      var appListParts = [];
      var protocolModule = /^https:/.test(config.AppListingEndpoint) ? https : http;
      var appListingUrl = config.AppListingEndpoint + accessToken;
      protocolModule.get(appListingUrl, function(resp) {
        resp.on('data', function(chunk) {
          appListParts.push(chunk);
        });
        resp.on('end', function() {
          try {
            var apps = JSON.parse(appListParts.join('')).map(function(appJson) {
              var cleanAppJson = {
                id: appJson.id,
                appId: appJson.app_id,
                name: appJson.name,
                platform: (appJson.platform === 'osx' ? 'darwin' : (appJson.platform === 'windows' ? 'win32' : appJson.platform)),
                iconUrl: appJson.icon_url,
                tileUrl: appJson.tile_url,
                binaryUrl: appJson.binary_url,
                version: appJson.version_number,
                changelog: appJson.changelog,
                releaseDate: appJson.certified_at || appJson.created_at
              };
              console.log(JSON.stringify(cleanAppJson));
              if (cleanAppJson.platform === os.platform()) {
                return new StoreLeapApp(cleanAppJson);
              } else {
                return null;
              }
            });

            cb(null, _(apps).compact());
          } catch(e) {
            cb(e);
          }
        });
      });
    }
  });
}

function localApps() {
  return FakeLocalAppData[os.platform()] || [];
}

module.exports.storeApps = storeApps;
module.exports.localApps = localApps;

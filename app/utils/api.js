var http = require('http');
var https = require('https');
var os = require('os');

var config = require('../../config/config.js');
var oauth = require('./oauth.js');

var StoreLeapApp = require('../models/store-leap-app.js');

// TODO: real data
var FakeLocalAppData = require('../../config/local-apps.js');

var pubnub = require("pubnub").init({
    subscribe_key : config.PubnubSubscribeKey,
    ssl           : true
});

var userid;

function setUser(user) {
  userid = user;
  pubnub.subscribe({
    channel: user + ".user.purchased",
    callback: appPurchased
  });
}

function appPurchased(appJson) {
  app = cleanAppJSON(appJson)
  if (app) {
    console.log("app purchased" + app);
  }
}

function appUpdated(appJson) {
  app = cleanAppJSON(appJson)
  if (app) {
    uiGlobals.installedApps.add(app);
    console.log("app updated " + app);
  }
}

function cleanAppJSON(appJson) {
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
  if (cleanAppJson.platform === os.platform()) {
    return new StoreLeapApp(cleanAppJson);
  } else {
    return null;
  }
}

function storeApps(cb) {
  oauth.getAccessToken(function(err, accessToken) {
    if (err) {
      return cb(err);
    } else {
      var appListParts = [];
      var protocolModule = /^https:/.test(config.AppListingEndpoint) ? https : http;
      var platform = process.platform === 'darwin' ? 'osx' : 'windows';
      var appListingUrl = config.AppListingEndpoint + accessToken + '&platform=' + platform;
      protocolModule.get(appListingUrl, function(resp) {
        resp.on('data', function(chunk) {
          appListParts.push(chunk);
        });
        resp.on('end', function() {
          try {
            var apps = JSON.parse(appListParts.join('')).map(function(appJson) {
              if (appJson.userid) {
                setUser(appJson.userid);
                return null;
              } else {
                pubnub.subscribe({
                  channel: appJson.app_id + ".app.updated",
                  callback: appUpdated
                });
                console.log(JSON.stringify(appJson));
                return cleanAppJSON(appJson)
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

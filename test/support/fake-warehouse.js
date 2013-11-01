var express = require('express');

var newApp = require('./new-app.js');
var randomValue = require('./random-value.js');

var app = express();

var availableAppsByPlatform = {};
var appsByAppId = {};

function getApp(overrides) {
  var appId = overrides.app_id;
  var app = appsByAppId[appId];
  if (!app) {
    app = newApp.withOverrides(overrides);
    appsByAppId[app.appId] = app;
  }
  return app;
}

function getAppsForPlatform(platform) {
  if (!availableAppsByPlatform[platform]) {
    availableAppsByPlatform[platform] = [
      {
        user_id: randomValue.randomInt(4),
        auth_id: 4000,
        secret_token: randomValue.randomString(16)
      },
      getApp({ platform: platform, app_id: 1 }),
      getApp({ platform: platform, app_id: 2 }),
      getApp({ platform: platform, app_id: 3 })
    ];
  }
  return availableAppsByPlatform[platform];
}

app.get('/api/apps/myapps', function(req, res) {
  if (!req.query.access_token) {
    res.send(400, 'Access token required.');
  } else if (!req.query.platform) {
    res.send(400, 'Platform required.');
  } else {
    res.json(200, getAppsForPlatform(req.query.platform));
  }
});

app.get('/api/apps/:id/homebase/:platform', function(req, res) {
  res.json(200, getApp({ app_id: req.params.id, platform: req.params.platform }));
});

module.exports = app;

if (require.main === module) {
  app.listen(9877);
}

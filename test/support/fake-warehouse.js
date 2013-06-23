var express = require('express');

var newApp = require('./new-app.js');
var randomValue = require('./random-value.js');

var app = express();

var availableAppsByPlatform = {};

function getAppsForPlatform(platform) {
  if (!availableAppsByPlatform[platform]) {
    availableAppsByPlatform[platform] = [
      {
        user_id: randomValue.randomInt(4),
        auth_id: 4000,
        secret_token: randomValue.randomString(16)
      },
      newApp.withOverrides({ platform: platform }),
      newApp.withOverrides({ platform: platform }),
      newApp.withOverrides({ platform: platform })
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

module.exports = app;

if (require.main === module) {
  app.listen(9877);
}

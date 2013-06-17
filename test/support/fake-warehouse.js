var express = require('express');

var newApp = require('./new-app.js');
var randomValue = require('./random-value.js');

var app = express();

app.get('/api/apps/myapps', function(req, res) {
  if (!req.query.access_token) {
    res.send(400, 'Access token required.');
  } else if (!req.query.platform) {
    res.send(400, 'Platform required.');
  } else {
    res.json(200, [
      {
        user_id: randomValue.randomInt(4),
        auth_id: 4000,
        secret_token: randomValue.randomString(16)
      },
      newApp.withOverrides({ platform: req.query.platform }),
      newApp.withOverrides({ platform: req.query.platform }),
      newApp.withOverrides({ platform: req.query.platform })
    ]);
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(9877);
}

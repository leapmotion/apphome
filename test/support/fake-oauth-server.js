var express = require('express');

var randomValue = require('./random-value.js');
var config = require('../../config/config.js');

var FakeAuthorizationCode = randomValue.randomString(16);
var FakeRefreshToken = randomValue.randomString(16);
var FakeAccessToken = randomValue.randomString(16);

var app = express();

app.use(express.bodyParser());

app.all(/\/oauth(\/.+)?/, function(req, res) {
  if (req.query.client_id === config.oauth.client_id &&
      req.query.redirect_uri === config.oauth.redirect_uri &&
      req.query.response_type === 'code') {
      res.redirect('/users/sign_in');
  } else if (req.body.client_id === config.oauth.client_id &&
             req.body.redirect_uri === config.oauth.redirect_uri &&
             req.body.client_secret === config.oauth.client_key) {
    if (req.body.grant_type === 'authorization_code') {
      if (req.body.code === FakeAuthorizationCode) {
        res.json(200, {
          refresh_token: FakeRefreshToken
        });
      } else {
        res.json(400, {
          error: true,
          error_description: 'Bad authorization code.'
        });
      }
    } else if (req.body.grant_type === 'refresh_token') {
      if (req.body.refresh_token === FakeRefreshToken) {
        res.json(200, {
          access_token: FakeAccessToken
        });
      } else {
        res.json(400, {
          error: true,
          error_description: 'Bad refresh token.'
        });
      }
    } else {
      res.json(400, {
        error: true,
        error_description: 'Invalid request.'
      });
    }
  } else {
    res.send(400, 'Invalid request.');
  }
});

app.all('/users/sign_in', function(req, res) {
  if (req.body.username && req.body.password) {
    res.redirect('/?code=' + FakeAuthorizationCode);
  } else {
    res.send(200, '<form id="new_user" action="/users/sign_in" method="post"><input name="username" placeholder="Username"/><input type="password" name="password" placeholder="Password"/><input type="submit"/></form>');
  }
});

app.get('/users/sign_up', function(req, res) {
  res.send(200, '<form id="new_user" action="/users/sign_in" method="post"><input name="username" placeholder="Username"/><input name="email" placeholder="Email"/><input type="password" name="password" placeholder="Password"/><input type="password" name="confirm_password" placeholder="Confirm Password"/><input type="submit"/></form>');
});

app.get('/users/sign_out', function(req, res) {
  FakeAuthorizationCode = randomValue.randomString(16);
  FakeRefreshToken = randomValue.randomString(16);
  FakeAccessToken = randomValue.randomString(16);
  res.send(200);
});

app.get('/', function(req, res) {
  res.send(200);
});

module.exports = app;

if (require.main === module) {
  app.listen(9876);
}

var http = require('http');
var https = require('https');
var qs = require('querystring');
var url = require('url');

var config = require('../../config/config.js');
var db = require('./db.js');

var OauthRefreshTokenDbKey = 'OauthRefreshToken';

function saveRefreshToken(refreshToken) {
  db.setItem(OauthRefreshTokenDbKey, refreshToken);
}

function getRefreshToken() {
  return db.getItem(OauthRefreshTokenDbKey);
}

function getAuthorizationUrl() {
  var params = {
    response_type: 'code',
    client_id: config.oauth.client_id,
    redirect_uri: config.oauth.redirect_uri
  };
  return config.oauth.endpoint + 'authorize/?' + qs.stringify(params);
}

function oauthRequest(params, cb) {
  params = _.extend({}, params, {
    client_id: config.oauth.client_id,
    client_secret: config.oauth.client_key,
    redirect_uri: config.oauth.redirect_uri
  });
  var urlParts = url.parse(config.oauth.endpoint);
  var options = {
    hostname: urlParts.hostname,
    path: urlParts.pathname + 'token',
    port: urlParts.port,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  var protocolModule = (urlParts.protocol === 'https:' ? https : http);
  var responseChunks = [];
  var req = protocolModule.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      responseChunks.push(chunk);
    });
    res.on('end', function() {
      cb && cb(null, JSON.parse(responseChunks.join('')));
    });
  });

  req.on('error', function(err) {
    cb && cb(err);
  });

  req.end(qs.stringify(params));
}

function authorizeWithCode(code, cb) {
  return oauthRequest({
    grant_type: 'authorization_code',
    code: code
  }, function(err, result) {
    if (err) {
      return cb(err);
    }
    if (result.error) {
      return cb(new Error(result.error_description));
    }
    saveRefreshToken(result.refresh_token);
    cb(null);
  });
}

function getAccessToken(cb) {
  if (!getRefreshToken()) {
    return cb(new Error('Missing refresh token.'));
  }
  return oauthRequest({
    grant_type: 'refresh_token',
    refresh_token: getRefreshToken()
  }, function(err, result) {
    if (err) {
      return cb(err);
    }
    if (result.error) {
      return cb(new Error(result.error_description));
    }
    cb(null, result.access_token);
  });
}

module.exports.getAuthorizationUrl = getAuthorizationUrl;
module.exports.authorizeWithCode = authorizeWithCode;
module.exports.getAccessToken = getAccessToken;

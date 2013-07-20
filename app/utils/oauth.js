var http = require('http');
var https = require('https');
var qs = require('querystring');
var url = require('url');

var config = require('../../config/config.js');
var db = require('./db.js');

var AuthorizationView = require('../views/authorization/authorization.js');

function saveRefreshToken(refreshToken) {
  db.setItem(config.DbKeys.OauthRefreshToken, refreshToken);
}

function getRefreshToken() {
  return db.getItem(config.DbKeys.OauthRefreshToken);
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
    auth: urlParts.auth,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  var protocolModule = (urlParts.protocol === 'https:' ? https : http);
  var responseChunks = [];
  console.log('Making oauth request: ' + JSON.stringify(options));
  var req = protocolModule.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      responseChunks.push(chunk);
    });
    res.on('end', function() {
      var result;
      try {
        result = JSON.parse(responseChunks.join(''));
      } catch(e) {
        return cb && cb(e);
      }
      cb && cb(null, result);
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
      cb && cb(err);
    } else if (result.error) {
      cb && cb(new Error(result.error_description));
    } else {
      saveRefreshToken(result.refresh_token);
      cb && cb(null);
    }
  });
}

var promptingForLogin;
function promptForLogin(cb) {
  promptingForLogin = true;
  var authorizationView = new AuthorizationView();
  authorizationView.authorize(function(err) {
    if (err) {
      console.warn('Error logging in: ' + err.stack || err);
    }
    authorizationView.remove();
    promptingForLogin = false;
    cb && cb(null); // skip auth if there's an error
  });
}

var accessTokenExpiry;
var accessToken;
function getAccessToken(cb) {
  var now = (new Date()).getTime();
  if (accessToken && accessTokenExpiry && (now < accessTokenExpiry)) {
    console.log('Using cached OAUTH access token.');
    cb && cb(null, accessToken);
    return;
  }

  console.log('Getting OAUTH access token.');
  if (!getRefreshToken() && !promptingForLogin) {
    promptForLogin(function() {
      getAccessToken(cb);
    });
  } else {
    return oauthRequest({
      grant_type: 'refresh_token',
      refresh_token: getRefreshToken()
    }, function(err, result) {
      if (err) {
        cb && cb(err);
      } else if (result.error) {
        if (promptingForLogin) {
          cb && cb(new Error(result.error));
        } else {
          promptForLogin(function() {
            getAccessToken(cb);
          });
        }
      } else {
        accessToken = result.access_token;
        accessTokenExpiry = now + config.oauth.auth_token_expiration_time;
        cb && cb(null, accessToken);
      }
    });
  }
}

function logOut() {
  db.removeItem(config.DbKeys.OauthRefreshToken);
  accessToken = null;
}

function logOutUrl() {
  return config.oauth.log_out_url;
}

module.exports.getAuthorizationUrl = getAuthorizationUrl;
module.exports.getRefreshToken = getRefreshToken;
module.exports.authorizeWithCode = authorizeWithCode;
module.exports.getAccessToken = getAccessToken;
module.exports.logOut = logOut;
module.exports.logOutUrl = logOutUrl;


var http = require('http');
var https = require('https');
var qs = require('querystring');
var url = require('url');

function saveRefreshToken(refreshToken) {
  //TODO: use localstorage
  global.REFRESH_TOKEN = refreshToken;
}

function getRefreshToken(refreshToken) {
  //TODO: use localstorage
  return global.REFRESH_TOKEN;
}

function getAuthorizationUrl() {
  var params = {
    response_type: 'code',
    client_id: CONFIG.oauth.client_id,
    redirect_uri: CONFIG.oauth.redirect_uri
  };
  return CONFIG.oauth.endpoint + 'authorize/?' + qs.stringify(params);
}

function oauthRequest(params, cb) {
  params = _.extend({}, params, {
    client_id: CONFIG.oauth.client_id,
    client_secret: CONFIG.oauth.client_key,
    redirect_uri: CONFIG.oauth.redirect_uri
  });
  var urlParts = url.parse(CONFIG.oauth.endpoint);
  var options = {
    hostname: urlParts.hostname,
    path: urlParts.pathname + 'token',
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


authorizeWithCode(process.argv[2], function(err) {
  if (err) {
    return console.log(err);
  }
  getAccessToken(function(err, accessToken) {
    console.log(err ? err : accessToken);
  });
});



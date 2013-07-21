var fs = require('fs');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var qs = require('querystring');
var url = require('url');

var config = require('../../config/config.js');
var DownloadProgressStream = require('./download-progress-stream.js');
var workingFile = require('./working-file.js');

function isRedirect(serverResponse) {
  return serverResponse.statusCode >= 301 && serverResponse.statusCode <= 303 && serverResponse.headers.location;
}

function makeRequest(sourceUrl) {
  var req = protocolModuleForUrl(sourceUrl).get(sourceUrl, function(res) {
    if (isRedirect(res)) {
      req.emit('redirect', res.headers.location);
    } else if (res.statusCode !== 200) {
      req.emit('error', new Error('Got status code: ' + res.statusCode));
    } else {
      res.on('error', function() {
        res.removeAllListeners();
      });

      res.on('cancel', function() {
        res.removeAllListeners();
      });

      res.on('close', function() {
        res.removeAllListeners();
      });

      req.emit('connected', res);
    }
  });

  return req;
}

function getToDisk(sourceUrl, opts, cb) {
  opts = opts || {};
  if (!sourceUrl) {
    return cb(new Error('No source url specified.'));
  }
  if (!cb && _.isFunction(opts)) {
    cb = opts;
    opts = {};
  }

  if (opts.accessToken) {
    var urlParts = url.parse(sourceUrl, true);
    urlParts.query.access_token = opts.accessToken;
    sourceUrl = url.format(urlParts);
  }

  var destPath = opts.destPath || workingFile.newTempPlatformArchive();
  var progressStream = opts.progressStreamOverride || new DownloadProgressStream();

  var destStream = fs.createWriteStream(destPath);
  var request = makeRequest(sourceUrl);

  request.on('connected', function(serverResponse) {
    function cleanup() {
      serverResponse.removeAllListeners();
      request.removeAllListeners();
      destStream.removeAllListeners();
    }

    progressStream.listenTo(serverResponse);

    serverResponse.on('cancel', function() {
      cleanup();
      destStream.end();
      try {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      } catch (err) {
        console.warn('Could not cleanup cancelled download: ' + (err.stack || err));
      }
      var err = new Error('Download cancelled.');
      err.cancelled = true;
      cb && cb(err);
      cb = null;
    });

    destStream.on('error', function(err) {
      cleanup();
      cb && cb(err);
      cb = null;
    });

    destStream.on('close', function() {
      cleanup();
      if (progressStream.isFullyDownloaded()) {
          cb && cb(null, destPath);
        } else {
          cb && cb(new Error('Expected: ' + progressStream.totalBytes + ' bytes, but got: ' + progressStream.bytesSoFar + ' bytes.'));
        }
      cb = null;
    });

    serverResponse.pipe(destStream);
  });

  request.on('error', function(err) {
    destStream.end();
    destStream.removeAllListeners();
    request.removeAllListeners();
    cb && cb(err);
    cb = null;
  });

  request.on('redirect', function(newUrl) {
    destStream.end();
    destStream.removeAllListeners();
    request.removeAllListeners();
    getToDisk(newUrl, _({ progressStreamOverride: progressStream }).extend(opts), cb);
  });

  return progressStream;
}

function getJson(url, cb) {
  var responseParts = [];
  var req = makeRequest(url);

  req.on('connected', function(res) {
    res.on('data', function(chunk) {
      responseParts.push(chunk);
    });
    res.on('end', function() {
      req.removeAllListeners();
      res.removeAllListeners();
      try {
        cb && cb(null, JSON.parse(responseParts.join('')));
      } catch(err) {
        cb && cb(err);
      } finally {
        cb = null;
      }
    });

    res.on('error', function(err) {
      req.removeAllListeners();
      res.removeAllListeners();
      cb && cb(err);
      cb = null;
    });
  });

  req.on('error', function(err) {
    req.removeAllListeners();
    cb && cb(err);
    cb = null;
  });

  req.on('redirect', function(newUrl) {
    req.removeAllListeners();
    getJson(newUrl, cb);
  });
}

function post(requestUrl, data, cb) {
  var urlParts = url.parse(requestUrl);
  var options = {
    hostname: urlParts.hostname,
    path: urlParts.pathname,
    port: urlParts.port,
    auth: urlParts.auth,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  var req = protocolModuleForUrl(requestUrl).request(options, function(res) {
    if (res.statusCode !== 200) {
      req.removeAllListeners();
      cb && cb(new Error('Got status code: ' + res.statusCode));
      cb = null;
    } else {
      res.on('error', function(err) {
        req.removeAllListeners();
        res.removeAllListeners();
        cb && cb(err);
        cb = null;
      });

      res.on('end', function() {
        req.removeAllListeners();
        res.removeAllListeners();
        cb && cb(null);
        cb = null;
      });
    }
  });

  req.on('error', function(err) {
    req.removeAllListeners();
    cb && cb(err);
    cb = null;
  });

  req.end(qs.stringify(data));
}

function protocolModuleForUrl(requestUrl) {
  return (/^https:/i.test(requestUrl) ? https : http);
}

module.exports.getToDisk = getToDisk;
module.exports.getJson = getJson;
module.exports.post = post;

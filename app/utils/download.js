var events = require('events');
var fs = require('fs');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var url = require('url');
var util = require('util');

var config = require('../../config/config.js');
var oauth = require('./oauth.js');
var workingFile = require('./working-file.js');

function DownloadProgressStream() {
  this._bytesSoFar = 0;
}

util.inherits(DownloadProgressStream, events.EventEmitter);

DownloadProgressStream.prototype.setTotalBytes = function(totalBytes) {
  this._totalBytes = Number(totalBytes);
};

DownloadProgressStream.prototype.listenTo = function(res) {
  this._res = res;

  this._res.on('data', function(chunk) {
    this._bytesSoFar += chunk.length;
    this.emit('progress', this._bytesSoFar / this._totalBytes);
  }.bind(this));

  this._res.on('end', function() {
    this.emit('end');
  }.bind(this));
};

DownloadProgressStream.prototype.cancel = function() {
  if (this._res) {
    this._res.emit('cancel');
    this._res = null;
    return true;
  } else {
    return false;
  }
};


function getFile(sourceUrl, destPath, sendAccessToken, cb, progressStreamOverride) {
  if (!sourceUrl) {
    return cb(new Error('No source url specified.'));
  }

  var platformExtension = (os.platform() === 'darwin' ? 'dmg' : 'zip');
  if (!cb && _.isFunction(sendAccessToken)) {
    // 3 param case (sourceUrl, destPath, cb)
    cb = sendAccessToken;
    sendAccessToken = false;
  } else if (!cb && !sendAccessToken && _.isFunction(destPath)) {
    // 2 param case (sourceUrl, cb)
    cb = destPath;
    destPath = workingFile.newTempFilePath(platformExtension);
  } else if (!destPath) {
    destPath = workingFile.newTempFilePath(platformExtension);
  }

  var totalBytes = 0;
  var destStream = fs.createWriteStream(destPath);
  var progressStream = progressStreamOverride || new DownloadProgressStream();
  var request;

  destStream.on('error', function(err) {
    cleanup();
    cb && cb(err);
    cb = null;
  });

  destStream.on('close', function() {
    try {
      cleanup();
      var fileSize = fs.statSync(destPath).size;
      if (isNaN(totalBytes) || fileSize === totalBytes) {
        cb && cb(null, destPath);
      } else {
        cb && cb(new Error('Expected: ' + totalBytes + ' bytes, but got: ' + fileSize + ' bytes.'));
      }
    } catch(err) {
      cb && cb(err);
    }
    cb = null;
  });

  function makeRequest(accessToken) {
    var protocolModule;
    var urlParts = url.parse(sourceUrl, true);
    if (urlParts.protocol === 'https:') {
      protocolModule = https;
    } else {
      protocolModule = http;
    }

    if (accessToken) {
      urlParts.query.access_token = accessToken;
      sourceUrl = url.format(urlParts);
    }

    var req = protocolModule.get(sourceUrl, function(res) {
      if (res.statusCode >= 301 && res.statusCode <= 303 && res.headers['location']) {
        // handle redirect
        cleanup(res);
        return getFile(res.headers['location'], destPath, sendAccessToken, cb, progressStream);
      } else if (res.statusCode !== 200) {
        cleanup(res);
        cb && cb(new Error('Got status code: ' + res.statusCode));
        cb = null;
        return;
      }

      totalBytes = Number(res.headers['content-length']);
      progressStream.setTotalBytes(totalBytes);
      progressStream.listenTo(res);

      res.on('error', function(err) {
        cleanup(res);
        cb && cb(err);
        cb = null;
      });

      res.on('cancel', function() {
        cleanup(res);
        try {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
        } catch (err) {
          console.error('Could not cleanup cancelled download: ' + (err.stack || err));
        }
        var err = new Error('Download cancelled.');
        err.cancelled = true;
        cb && cb(err);
        cb = null;
      });

      res.on('close', function() {
        res.removeAllListeners();
      });

      res.pipe(destStream);
    });

    req.on('error', function(err) {
      cleanup();
      cb && cb(err);
      cb = null;
    });

    return req;
  }

  function cleanup(res) {
    res && res.removeAllListeners();
    request && request.removeAllListeners();
    destStream.removeAllListeners();
    destStream.close();
  }

  if (sendAccessToken) {
    oauth.getAccessToken(function(err, accessToken) {
      request = makeRequest(accessToken);
    });
  } else {
    request = makeRequest();
  }

  return progressStream;
}

function getFileWithFallback(sourceUrl, destPath, fallbackPath, cb) {
  if (sourceUrl) {
    return getFile(sourceUrl, destPath, function(err) {
      cb(null, err ? fallbackPath : destPath);
    });
  } else {
    cb(null, fallbackPath);
  }
}

module.exports.get = getFile;
module.exports.getWithFallback = getFileWithFallback;

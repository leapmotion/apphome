var events = require('events');
var fs = require('fs');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var url = require('url');
var util = require('util');
var config = require('../../config/config.js');
var workingFile = require('../utils/working-file.js');

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


function getFile(sourceUrl, destPath, cb) {
  if (!sourceUrl) {
    return cb(new Error('No source url specified.'));
  }

  if (typeof destPath === 'function') {
    cb = destPath;
    destPath = workingFile.newTempFilePath(os.platform() === 'darwin' ? 'dmg' : 'zip');
  }
  var totalBytes = 0;
  var destStream = fs.createWriteStream(destPath);
  var progressStream = new DownloadProgressStream();

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

  var protocolModule;
  if (url.parse(sourceUrl).protocol === 'https:') {
    protocolModule = https;
  } else {
    protocolModule = http;
  }

  var req = protocolModule.get(sourceUrl, function(res) {
    if (res.statusCode >= 301 && res.statusCode <= 303 && res.headers['location']) {
      // handle redirect
      cleanup(res);
      return getFile(res.headers['location'], destPath, cb);
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

  function cleanup(res) {
    res && res.removeAllListeners();
    req.removeAllListeners();
    destStream.removeAllListeners();
    destStream.close();
  }

  req.on('error', function(err) {
    cleanup();
    cb && cb(err);
    cb = null;
  });

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

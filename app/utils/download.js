var events = require('events');
var fs = require('fs');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var url = require('url');
var util = require('util');

var PlatformTempDirs = {
  win32:  process.env.TEMP,
  darwin: '/tmp',
  linux:  '/tmp'
};

function DownloadProgressStream() {
  this._bytesSoFar = 0;
}

util.inherits(DownloadProgressStream, events.EventEmitter);

DownloadProgressStream.prototype.setTotalBytes = function(totalBytes) {
  this._totalBytes = Number(totalBytes);
}

DownloadProgressStream.prototype.listenTo = function(res) {
  res.on('data', function(chunk) {
    this._bytesSoFar += chunk.length;
    this.emit('progress', this._bytesSoFar / this._totalBytes);
  }.bind(this));

  res.on('end', function() {
    this.emit('end');
  }.bind(this));
}

function newTempFilePath(extension) {
  extension = extension || '';
  if (!PlatformTempDirs[os.platform()]) {
    throw new Error('Unknown operating system: ' + os.platform());
  }
  var tempDir = PlatformTempDirs[os.platform()];
  var filename = [ 'Airspace', (new Date()).getTime(), Math.random() ].join('_') + '.' + extension.replace(/^\./, '');
  return path.join(tempDir, filename);
}

function getFile(sourceUrl, destPath, cb) {
  if (!sourceUrl) {
    return cb(new Error('No source url specified.'));
  }

  if (typeof destPath === 'function') {
    cb = destPath;
    destPath = newTempFilePath(os.platform() === 'darwin' ? 'dmg' : 'zip');
  }
  var totalBytes = 0;
  var destStream = fs.createWriteStream(destPath);
  var progressStream = new DownloadProgressStream();

  destStream.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });

  destStream.on('close', function() {
    try {
      var fileSize = fs.statSync(destPath).size;
      if (fileSize === totalBytes) {
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
    totalBytes = Number(res.headers['content-length']);
    progressStream.setTotalBytes(totalBytes);
    progressStream.listenTo(res);

    res.on('error', function(err) {
      cb && cb(err);
      cb = null;
    });

    res.pipe(destStream);
  });

  req.on('error', function(err) {
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

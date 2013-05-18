var events = require('events');
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var util = require('util');

var PlatformTempDirs = {
  win32:  process.env.TEMP,
  darwin: process.env.TMPDIR,
  linux:  '/tmp'
};

function DownloadProgressStream() {
  this._bytesSoFar = 0;
}

util.inherits(DownloadProgressStream, events.EventEmitter);

DownloadProgressStream.prototype.setTotalBytes = function(totalBytes) {
  this._totalBytes = Number(totalBytes);
}

DownloadProgressStream.prototype.listenTo = function(resp) {
  resp.on('data', function(chunk) {
    this._bytesSoFar += chunk.length;
    this.emit('progress', this._bytesSoFar / this._totalBytes);
  }.bind(this));

  resp.on('end', function() {
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
  if (typeof destPath === 'function') {
    cb = destPath;
    destPath = newTempFilePath(path.extname(sourceUrl));
  }
  var destStream = fs.createWriteStream(destPath);
  var progressStream = new DownloadProgressStream();

  destStream.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
  var req = http.get(sourceUrl, function(res) {
    progressStream.setTotalBytes(res.headers['content-length']);
    progressStream.listenTo(res);

    res.pipe(destStream);
    destStream.on('close', function() {
      cb && cb(null, destPath);
      cb = null;
    });
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

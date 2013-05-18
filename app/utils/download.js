var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');

var PlatformTempDirs = {
  win32:  process.env.TEMP,
  darwin: process.env.TMPDIR,
  linux:  '/tmp'
};

function tempFile(extension) {
  extension = extension || '';
  if (!PlatformTempDirs[os.platform()]) {
    throw new Error('Unknown operating system: ' + os.platform());
  }
  var tempDir = PlatformTempDirs[os.platform()];
  var filename = [ 'Airspace', (new Date()).getTime(), Math.random() ].join('_') + '.' + extension.replace(/^\./, '');
  return path.join(tempDir, filename);
}

function download(url, destFilename, cb) {
  var destStream = fs.createWriteStream(destFilename);

  destStream.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
  var req = http.get(url, function(res) {
    res.pipe(destStream);
    destStream.on('close', function() {
      cb && cb(null, destFilename);
      cb = null;
    });
  });
  req.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
}

module.exports = download;
module.exports.tempFile = tempFile;

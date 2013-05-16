var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');

var PlatformTempDirs = {
  win32:  process.env.TEMP,
  darwin: process.env.TMPDIR,
  linux:  '/tmp'
}

function tempFile() {
  if (!PlatformTempDirs[os.platform()]) {
    throw new Error('Unknown operating system: ' + os.platform());
  }
  var tempDir = PlatformTempDirs[os.platform()];
  var filename = [ 'Airspace', (new Date()).getTime(), Math.random() ].join('_');
  return path.join(tempDir, filename);
}

function download(url, cb) {
  var destFilename = tempFile();
  var destStream = fs.createWriteStream(destFilename);

  var req = http.get(url, function(res) {
    res.on('error', function(err) {
      res.removeAllListeners();
      cb(err);
    });
    res.on('data', function(chunk) {
      destStream.write(chunk);
    });
    res.on('end', function() {
      destStream.end();
      cb(null, destFilename);
    });
  });
  req.on('error', cb);
}

module.exports = download;

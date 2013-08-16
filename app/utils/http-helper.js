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

  var fd = fs.openSync(destPath, 'w');
  var chunksize = 1024 * 1024 * 10;
  var position = 0;

  // downloadFile returns a method that can be used to cancel the download
  var canceller = global.downloadFile(sourceUrl, function(error, data) {
    if (error) {
      console.error(error);
    } else {
      // write a chunk
      var buff = new Buffer(data, 'base64');
      // console.log('writing', buff.length, position, destPath);
      fs.writeSync(fd, buff, 0, buff.length, position);
      position += buff.length;
    }
  }, function(error, data) {
    if (error) {
      if (! error.cancelled) {
        console.error('Error downloading', url, error);
      }
    } else {
      // fs.writeFile(destPath, data);
      cb && cb(null, destPath);
    }
  }, chunksize, function(progress) {
    // console.log('progress', progress);
    progressStream.emit('progress', progress);
  });

  var cleanup = function() {
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
    // clean up the XHR on the other end
    canceller && canceller();
    canceller = null;
  };

  // Tell the progress stream who to call when cancelling a download
  progressStream.setCanceller(cleanup);

  return progressStream;
}

function getJson(url, cb) {
  global.getData(url, function(error, data) {
    if (error) {
      console.error(error);
    } else {
      if (data) data = JSON.parse(data);
      // console.log('getJson', data)
      cb(error, data);
    }
  });
}

function post(requestUrl, data, cb) {
  global.postData(requestUrl, data, cb);
}

module.exports.getToDisk = getToDisk;
module.exports.getJson = getJson;
module.exports.post = post;
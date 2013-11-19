var Buffer = require('buffer').Buffer;
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

var DownloadChunkSize = 1024 * 1024 * 5; // 5 MB

function getFileSize(requestUrl, cb) {
  var fileSize;
  var xhr = new window.XMLHttpRequest();
  xhr.open('GET', requestUrl);
  xhr.onprogress = function(evt) {
    if (evt.total) {
      this.abort();
      nwGui.App.clearCache();
      fileSize = evt.total;
      cb && cb(null, fileSize);
      cb = null;
    }
  };
  xhr.onload = function(evt) {
    if (typeof fileSize === 'undefined') {
      cb && cb(new Error('Could not determine filesize for URL: ' + requestUrl));
      cb = null;
    }
  };
  xhr.onerror = function(evt) {
    cb && cb(evt);
    cb = null;
  };
  xhr.send();
}

function downloadChunk(requestUrl, start, end, cb) {
  var xhr = new window.XMLHttpRequest();
  xhr.open('GET', requestUrl, true);
  xhr.responseType = 'arraybuffer';
  xhr.setRequestHeader('range', 'bytes=' + start + '-' + end);
  var startTime = Date.now();
  xhr.onload = function () {
    nwGui.App.clearCache();
    if (this.status >= 200 && this.status <= 299) {
      // Must use window.Uint8Array instead of the Node.js Uint8Array here because of node-webkit memory wonkiness.
      cb && cb(null, new Buffer(new window.Uint8Array(this.response)));
    } else {
      cb && cb(new Error('Got status code: ' + this.status + ' for chunk.'));
    }
    cb = null;
  };
  xhr.onerror = function(err) {
    cb && cb(err);
    cb = null;
  };
  xhr.timeout = 10000;
  xhr.ontimeout = function() {
    cb && cb(new Error('Chunk download timed out.'));
  };
  xhr.send();
  return xhr;
}

function getToDisk(requestUrl, opts, cb) {
  opts = opts || {};
  if (!requestUrl) {
    return cb(new Error('No source url specified.'));
  }
  if (!cb && _.isFunction(opts)) {
    cb = opts;
    opts = {};
  }

  if (opts.accessToken) {
    var urlParts = url.parse(requestUrl, true);
    urlParts.query.access_token = opts.accessToken;
    requestUrl = url.format(urlParts);
  }

  var destPath = opts.destPath || workingFile.newTempPlatformArchive();
  var progressStream = new DownloadProgressStream();

  var fd = fs.openSync(destPath, 'w');
  var currentRequest;
  getFileSize(requestUrl, function(err, fileSize) {
    if (err) {
      cb && cb(err);
    } else {
      var numChunks = Math.ceil(fileSize / DownloadChunkSize);
      console.debug('Downloading ' + fileSize + ' bytes in ' + numChunks + ' chunks (' + requestUrl + ')');
      var bytesSoFar = 0;
      // Called recursively to get and write all chunks.
      function downloadAllChunks(numRemainingChunks) {
        progressStream.emit('progress', bytesSoFar / fileSize);
        if (numRemainingChunks > 0) {
          var start = (numChunks - numRemainingChunks) * DownloadChunkSize;
          var end = Math.min(start + DownloadChunkSize - 1, fileSize);
          currentRequest = downloadChunk(requestUrl, start, end, function(err, chunk) {
            if (err) {
              console.info('Downloading chunk failed: ' + start + ' - ' + end + ' of ' + fileSize + ' ' + (err.stack || err) + ' (' + requestUrl + ')');
              fs.close(fd);
              cb && cb(err);
              cb = null;
            } else {
              bytesSoFar += chunk.length;
              fs.write(fd, chunk, 0, chunk.length, start, function(err) {
                chunk = null;
                if (err) {
                  console.info('Writing chunk failed: ' + start + ' - ' + end + ' of ' + fileSize + ' ' + (err.stack || err) + ' (' + requestUrl + ')');
                  fs.close(fd);
                  cb && cb(err);
                  cb = null;
                } else {
                  downloadAllChunks(numRemainingChunks - 1);
                }
              });
            }
          });
          currentRequest.onprogress = function(evt) {
            if (evt.lengthComputable) {
              progressStream.emit('progress', (bytesSoFar + evt.loaded) / fileSize);
            }
          };
        } else {
          fs.close(fd, function(err) {
            if (err) {
              cb && cb(err);
            } else if (bytesSoFar !== fileSize) {
              cb && cb(new Error('Expected file of size: ' + fileSize + ' but got: ' + bytesSoFar));
            } else {
              cb && cb(null, destPath);
            }
            cb = null;
          });
        }
      }
      downloadAllChunks(numChunks);
    }
  });

  // Tell the progress stream what to do when cancelling a download
  progressStream.setCanceller(function() {
    try {
      fs.closeSync(fd);
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
    } catch (err) {
      console.warn('Could not cleanup cancelled download: ' + (err.stack || err));
    }
    if (currentRequest) {
      currentRequest.abort();
      nwGui.App.clearCache();
    }
    var err = new Error('Download cancelled.');
    err.cancelled = true;
    cb && cb(err);
    cb = null;
  });

  return progressStream;
}

function getJson(requestUrl, cb) {
  window.$.getJSON(requestUrl, null, function(json) {
    nwGui.App.clearCache();
    cb && cb(null, json);
  }).fail(function() {
    cb && cb(new Error('GET failed: ' + requestUrl));
  });
}

function post(requestUrl, data, cb) {
  var xhr = new window.XMLHttpRequest();
  xhr.open('POST', requestUrl);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onload = function () {
    nwGui.App.clearCache();
    cb && cb(null, this.responseText);
    cb = null;
  };
  xhr.onerror = function(err) {
    cb && cb(err);
    cb = null;
  };
  xhr.send(qs.stringify(data));
}

module.exports.getToDisk = getToDisk;
module.exports.getJson = getJson;
module.exports.post = post;

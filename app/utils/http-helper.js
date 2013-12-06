// Generated by CoffeeScript 1.6.3
(function() {
  var Buffer, DownloadChunkSize, DownloadProgressStream, config, downloadChunk, fs, getFileSize, getJson, getToDisk, http, https, os, path, post, qs, url, workingFile;

  Buffer = require("buffer").Buffer;

  fs = require("fs");

  http = require("http");

  https = require("https");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  url = require("url");

  config = require("../../config/config.js");

  DownloadProgressStream = require("./download-progress-stream.js");

  workingFile = require("./working-file.js");

  DownloadChunkSize = 1024 * 1024 * 5;

  getFileSize = function(requestUrl, cb) {
    var fileSize, xhr;
    fileSize = void 0;
    xhr = new window.XMLHttpRequest();
    xhr.open("GET", requestUrl);
    xhr.onprogress = function(evt) {
      if (evt.total) {
        this.abort();
        nwGui.App.clearCache();
        fileSize = evt.total;
        cb && cb(null, fileSize);
        return cb = null;
      }
    };
    xhr.onload = function(evt) {
      if (typeof fileSize === "undefined") {
        cb && cb(new Error("Could not determine filesize for URL: " + requestUrl));
        return cb = null;
      }
    };
    xhr.onerror = function(evt) {
      cb && cb(evt);
      return cb = null;
    };
    return xhr.send();
  };

  downloadChunk = function(requestUrl, start, end, cb) {
    var startTime, xhr;
    xhr = new window.XMLHttpRequest();
    xhr.open("GET", requestUrl, true);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader("range", "bytes=" + start + "-" + end);
    startTime = Date.now();
    xhr.onload = function() {
      nwGui.App.clearCache();
      if (this.status >= 200 && this.status <= 299) {
        cb && cb(null, new Buffer(new window.Uint8Array(this.response)));
      } else {
        cb && cb(new Error("Got status code: " + this.status + " for chunk."));
      }
      return cb = null;
    };
    xhr.onerror = function(err) {
      cb && cb(err);
      return cb = null;
    };
    xhr.send();
    return xhr;
  };

  getToDisk = function(requestUrl, opts, cb) {
    var currentRequest, destPath, fd, progressStream, urlParts;
    opts = opts || {};
    if (!requestUrl) {
      return cb(new Error("No source url specified."));
    }
    if (!cb && _.isFunction(opts)) {
      cb = opts;
      opts = {};
    }
    if (opts.accessToken) {
      urlParts = url.parse(requestUrl, true);
      urlParts.query.access_token = opts.accessToken;
      requestUrl = url.format(urlParts);
    }
    destPath = opts.destPath || workingFile.newTempPlatformArchive();
    progressStream = new DownloadProgressStream();
    fd = fs.openSync(destPath, "w");
    currentRequest = void 0;
    getFileSize(requestUrl, function(err, fileSize) {
      var bytesSoFar, downloadAllChunks, numChunks;
      if (err) {
        return cb && cb(err);
      } else {
        numChunks = Math.ceil(fileSize / DownloadChunkSize);
        console.debug("Downloading " + fileSize + " bytes in " + numChunks + " chunks (" + requestUrl + ")");
        bytesSoFar = 0;
        downloadAllChunks = function(numRemainingChunks) {
          var end, start;
          progressStream.emit("progress", bytesSoFar / fileSize);
          if (numRemainingChunks > 0) {
            start = (numChunks - numRemainingChunks) * DownloadChunkSize;
            end = Math.min(start + DownloadChunkSize - 1, fileSize);
            currentRequest = downloadChunk(requestUrl, start, end, function(err, chunk) {
              if (err) {
                console.info("Downloading chunk failed: " + start + " - " + end + " of " + fileSize + " " + (err.stack || err) + " (" + requestUrl + ")");
                fs.close(fd);
                cb && cb(err);
                return cb = null;
              } else {
                bytesSoFar += chunk.length;
                return fs.write(fd, chunk, 0, chunk.length, start, function(err) {
                  chunk = null;
                  if (err) {
                    console.info("Writing chunk failed: " + start + " - " + end + " of " + fileSize + " " + (err.stack || err) + " (" + requestUrl + ")");
                    fs.close(fd);
                    cb && cb(err);
                    return cb = null;
                  } else {
                    return downloadAllChunks(numRemainingChunks - 1);
                  }
                });
              }
            });
            return currentRequest.onprogress = function(evt) {
              if (evt.lengthComputable) {
                return progressStream.emit("progress", (bytesSoFar + evt.loaded) / fileSize);
              }
            };
          } else {
            return fs.close(fd, function(err) {
              if (err) {
                cb && cb(err);
              } else if (bytesSoFar !== fileSize) {
                cb && cb(new Error("Expected file of size: " + fileSize + " but got: " + bytesSoFar));
              } else {
                cb && cb(null, destPath);
              }
              return cb = null;
            });
          }
        };
        return downloadAllChunks(numChunks);
      }
    });
    progressStream.setCanceller(function() {
      var err;
      try {
        fs.closeSync(fd);
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      } catch (_error) {
        err = _error;
        console.warn("Could not cleanup cancelled download: " + (err.stack || err));
      }
      if (currentRequest) {
        currentRequest.abort();
        nwGui.App.clearCache();
      }
      err = new Error("Download cancelled.");
      err.cancelled = true;
      cb && cb(err);
      return cb = null;
    });
    return progressStream;
  };

  getJson = function(requestUrl, cb) {
    return window.$.getJSON(requestUrl, null, function(json) {
      nwGui.App.clearCache();
      return cb && cb(null, json);
    }).fail(function() {
      return cb && cb(new Error("GET failed: " + requestUrl));
    });
  };

  post = function(requestUrl, data, cb) {
    var xhr;
    xhr = new window.XMLHttpRequest();
    xhr.open("POST", requestUrl);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function() {
      nwGui.App.clearCache();
      cb && cb(null, this.responseText);
      return cb = null;
    };
    xhr.onerror = function(err) {
      cb && cb(err);
      return cb = null;
    };
    return xhr.send(qs.stringify(data));
  };

  module.exports.getToDisk = getToDisk;

  module.exports.getJson = getJson;

  module.exports.post = post;

}).call(this);

// Generated by CoffeeScript 1.6.3
(function() {
  var Buffer, DownloadProgressStream, Q, XhrBinaryStream, config, downloadChunk, fs, getFileSize, getJson, getToDisk, http, https, os, path, post, qhttp, qs, stream, through, url, util, workingFile;

  Buffer = require("buffer").Buffer;

  fs = require("fs");

  http = require("http");

  https = require("https");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  stream = require("stream");

  url = require("url");

  util = require("util");

  through = require("through");

  Q = require("q");

  qhttp = require("q-io/http");

  config = require("../../config/config.js");

  workingFile = require("./working-file.js");

  DownloadProgressStream = require("./download-progress-stream.js");

  getFileSize = function(requestUrl, cb) {
    var deferred, fileSize, xhr;
    fileSize = void 0;
    xhr = new window.XMLHttpRequest();
    deferred = Q.defer();
    xhr.open("HEAD", requestUrl);
    xhr.onload = function(evt) {
      fileSize = Number(this.getResponseHeader('Content-Length'));
      if (fileSize == null) {
        return deferred.reject(new Error("Could not determine filesize for URL: " + requestUrl));
      } else {
        console.log('Downloading file of size', Math.round(fileSize / 1049000), 'MB from', requestUrl);
        return deferred.resolve(fileSize);
      }
    };
    xhr.onerror = function(evt) {
      return deferred.reject(new Error("Error determining filesize for URL: " + requestUrl));
    };
    xhr.send();
    return deferred.promise;
  };

  downloadChunk = function(requestUrl, start, end) {
    var deferred, xhr;
    xhr = new window.XMLHttpRequest();
    xhr.open("GET", requestUrl);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader("range", "bytes=" + start + "-" + end);
    deferred = Q.defer();
    deferred.promise.cancel = function() {
      return xhr.abort();
    };
    xhr.onload = function() {
      nwGui.App.clearCache();
      if (this.status >= 200 && this.status <= 299) {
        return deferred.resolve(new Buffer(new window.Uint8Array(this.response)));
      } else if (this.status === 416) {
        return deferred.resolve(null);
      } else {
        return deferred.reject(new Error("Got status code: " + this.status + " for chunk."));
      }
    };
    xhr.onprogress = function(evt) {
      if (evt.lengthComputable) {
        return deferred.notify(evt.loaded);
      }
    };
    xhr.onerror = function(evt) {
      return deferred.reject(new Error("Error downloading chunk " + start + '-' + end));
    };
    xhr.send();
    return deferred.promise;
  };

  XhrBinaryStream = function(targetUrl) {
    stream.Readable.call(this);
    this.bytesSoFar = 0;
    this.chunkSize = config.DownloadChunkSize;
    return this._targetUrl = targetUrl;
  };

  util.inherits(XhrBinaryStream, stream.Readable);

  XhrBinaryStream.prototype._read = function(size) {
    var _this = this;
    this.currentRequestPromise = downloadChunk(this._targetUrl, this.bytesSoFar, this.bytesSoFar + this.chunkSize);
    return this.currentRequestPromise.then(function(data) {
      _this.bytesSoFar += (data != null ? data.length : void 0) || 0;
      return _this.push(data);
    }, function(reason) {
      return _this.emit("error", reason);
    }, function(bytesLoadedByCurrentRequest) {
      return _this.emit("progress", _this.bytesSoFar + bytesLoadedByCurrentRequest);
    }).done();
  };

  XhrBinaryStream.prototype.cancel = function() {
    this.currentRequestPromise.cancel();
    this.cancelled = true;
    return this.push(null);
  };

  getToDisk = function(requestUrl, opts, cb) {
    var binaryStream, deferred, destPath, progressStream, urlParts, writeStream;
    deferred = Q.defer();
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
    binaryStream = new XhrBinaryStream(requestUrl);
    writeStream = fs.createWriteStream(destPath);
    binaryStream.on('error', function(err) {
      console.warn("Downloading chunk failed: " + (err.stack || err) + " (" + requestUrl + ")");
      return deferred.reject(err);
    });
    writeStream.on('error', function(err) {
      console.warn("Writing chunk failed: " + (err.stack || err) + " (" + destPath + ")");
      return deferred.reject(err);
    });
    getFileSize(requestUrl).then(function(fileSize) {
      binaryStream.pipe(writeStream);
      binaryStream.on('progress', function(bytesSoFar) {
        return progressStream.emit("progress", bytesSoFar / fileSize);
      });
      binaryStream.on('end', function() {
        if (this.bytesSoFar !== fileSize) {
          return deferred.reject(new Error("Expected file of size: " + fileSize + " but got: " + this.bytesSoFar));
        } else {
          return deferred.resolve(destPath.toString());
        }
      });
      return deferred.promise;
    });
    progressStream.setCanceller(function() {
      var err;
      binaryStream.unpipe();
      binaryStream.cancel();
      writeStream.end();
      try {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      } catch (_error) {
        err = _error;
        console.warn("Could not cleanup cancelled download: " + (err.stack || err));
        deferred.reject(err);
      }
      err = new Error("Cancelled download of " + requestUrl);
      err.cancelled = true;
      return deferred.reject(err);
    });
    deferred.promise.nodeify(cb);
    return progressStream;
  };

  getJson = function(requestUrl) {
    return Q(window.$.getJSON(requestUrl)).then(function(json) {
      nwGui.App.clearCache();
      return json;
    });
  };

  post = function(requestUrl, data, cb) {
    var xhr;
    xhr = new window.XMLHttpRequest();
    xhr.open("POST", requestUrl);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function() {
      nwGui.App.clearCache();
      if (typeof cb === "function") {
        cb(null, this.responseText);
      }
      return cb = null;
    };
    xhr.onerror = function(err) {
      if (typeof cb === "function") {
        cb(err);
      }
      return cb = null;
    };
    return xhr.send(qs.stringify(data));
  };

  module.exports.getToDisk = getToDisk;

  module.exports.getJson = getJson;

  module.exports.post = post;

}).call(this);

/*
//@ sourceMappingURL=http-helper.map
*/

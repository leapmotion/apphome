// Generated by CoffeeScript 1.6.3
(function() {
  var Buffer, Q, XHRDownloadStream, events, filesize, getFileSize, stream, util;

  Buffer = require("buffer").Buffer;

  events = require("events");

  stream = require("stream");

  filesize = require("filesize");

  util = require("util");

  Q = require("q");

  getFileSize = function(requestUrl) {
    var deferred, size, xhr;
    size = void 0;
    xhr = new window.XMLHttpRequest();
    deferred = Q.defer();
    xhr.open("HEAD", requestUrl);
    xhr.onload = function(evt) {
      size = Number(this.getResponseHeader('Content-Length'));
      if (size == null) {
        return deferred.reject(new Error("Could not determine filesize for URL: " + requestUrl));
      } else {
        console.log('Downloading', filesize(size), 'file from', requestUrl);
        return deferred.resolve(size);
      }
    };
    xhr.onerror = function(evt) {
      return deferred.reject(new Error("Error determining filesize for URL: " + requestUrl));
    };
    xhr.send();
    return deferred.promise;
  };

  XHRDownloadStream = function(targetUrl, canceller, chunkSize) {
    var _ref,
      _this = this;
    stream.Readable.call(this);
    this._canceller = canceller;
    if ((_ref = this._canceller) != null) {
      _ref.fin(function() {
        return this.unpipe();
      });
    }
    this._bytesSoFar = 0;
    this._fileSize = 0;
    this._chunkSize = chunkSize;
    this._targetUrl = targetUrl;
    this._done = false;
    getFileSize(targetUrl).then(function(fileSize) {
      return _this._fileSize = fileSize;
    });
    return null;
  };

  util.inherits(XHRDownloadStream, stream.Readable);

  XHRDownloadStream.prototype._read = function(size) {
    var chunkSize,
      _this = this;
    chunkSize = this._chunkSize || size;
    if (this._done) {
      if (!(this._fileSize && this._bytesSoFar !== this._fileSize)) {
        return this.push(null);
      } else {
        throw new Error("Expected file of size: " + filesize(this._fileSize) + " but got: " + filesize(this._bytesSoFar));
      }
    }
    return this._downloadChunk(this._targetUrl, this._bytesSoFar, this._bytesSoFar + chunkSize).then(function(data) {
      _this._bytesSoFar += (data != null ? data.length : void 0) || 0;
      if ((data != null ? data.length : void 0) < chunkSize || (_this._fileSize && _this._fileSize === _this._bytesSoFar)) {
        _this._done = true;
      }
      return _this.push(data);
    }, void 0, function(bytesLoadedByCurrentRequest) {
      var percentComplete;
      if (_this._fileSize) {
        percentComplete = (_this._bytesSoFar + bytesLoadedByCurrentRequest) / _this._fileSize;
      }
      return _this.emit("progress", percentComplete);
    }).fail(function(reason) {
      return _this.emit("error", reason);
    }).done();
  };

  XHRDownloadStream.prototype._downloadChunk = function(requestUrl, start, end) {
    var deferred, xhr, _ref;
    xhr = new window.XMLHttpRequest();
    xhr.open("GET", requestUrl);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader("range", "bytes=" + start + "-" + end);
    deferred = Q.defer();
    if ((_ref = this._canceller) != null) {
      _ref.fin(function() {
        return xhr.abort();
      });
    }
    xhr.onload = function() {
      if (this.status >= 200 && this.status <= 299) {
        deferred.resolve(new Buffer(new window.Uint8Array(this.response)));
      } else {
        deferred.reject(new Error("Got status code: " + this.status + " for chunk " + start + '-' + end));
      }
      return nwGui.App.clearCache();
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
    xhr = null;
    return deferred.promise;
  };

  module.exports = XHRDownloadStream;

}).call(this);

/*
//@ sourceMappingURL=xhr-download-stream.map
*/

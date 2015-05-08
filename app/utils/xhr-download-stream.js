// Generated by CoffeeScript 1.7.1
(function() {
  var Buffer, Q, XHRDownloadStream, events, filesize, getFileSize, oauth, stream, url, util;

  Buffer = require("buffer").Buffer;

  events = require("events");

  stream = require("stream");

  filesize = require("filesize");

  util = require("util");

  url = require("url");

  oauth = require("./oauth");

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
    var _ref;
    stream.Readable.call(this);
    this._canceller = canceller;
    if ((_ref = this._canceller) != null) {
      _ref.fin(function() {
        return this.unpipe();
      });
    }
    this._bytesSoFar = 0;
    this._errorsInLastChunk = 0;
    this._fileSize = 0;
    this._chunkSize = chunkSize;
    this._targetUrl = targetUrl;
    this._done = false;
    getFileSize(targetUrl).then((function(_this) {
      return function(fileSize) {
        return _this._fileSize = fileSize;
      };
    })(this));
    return null;
  };

  util.inherits(XHRDownloadStream, stream.Readable);

  XHRDownloadStream.prototype._read = function(size) {
    var chunkSize, sendChunkRequest, urlParts;
    chunkSize = this._chunkSize || size;
    if (this._done) {
      if (!(this._fileSize && this._bytesSoFar !== this._fileSize)) {
        return this.push(null);
      } else {
        this.emit("error", "Expected file of size: " + filesize(this._fileSize) + " but got: " + filesize(this._bytesSoFar));
      }
    }
    sendChunkRequest = (function(_this) {
      return function() {
        return _this._downloadChunk(_this._targetUrl, _this._bytesSoFar, _this._bytesSoFar + chunkSize).then(function(data) {
          _this._bytesSoFar += (data != null ? data.length : void 0) || 0;
          if ((data != null ? data.length : void 0) < chunkSize || (_this._fileSize && _this._fileSize === _this._bytesSoFar)) {
            _this._done = true;
          }
          _this._errorsInLastChunk = 0;
          return _this.push(data);
        }, void 0, function(bytesLoadedByCurrentRequest) {
          var percentComplete;
          if (_this._fileSize) {
            percentComplete = (_this._bytesSoFar + bytesLoadedByCurrentRequest) / _this._fileSize;
          }
          return _this.emit("progress", percentComplete);
        }).fail(function(reason) {
          _this._errorsInLastChunk += 1;
          if (_this._errorsInLastChunk >= 4) {
            return _this.emit("error", reason);
          } else {
            console.log('Error in chunk ' + _this._bytesSoFar + ' - ' + (_this._bytesSoFar + chunkSize) + ' but trying again ' + (4 - _this._errorsInLastChunk) + ' more times.');
            return setTimeout(function() {
              return _this._read(size);
            }, 1000);
          }
        }).done();
      };
    })(this);
    urlParts = url.parse(this._targetUrl, true);
    if (urlParts.query.access_token) {
      return Q.nfcall(oauth.getAccessToken).then((function(_this) {
        return function(accessToken) {
          urlParts.query.access_token = accessToken;
          delete urlParts.search;
          _this._targetUrl = url.format(urlParts);
          return sendChunkRequest();
        };
      })(this)).fail((function(_this) {
        return function(reason) {
          return _this.emit("error", reason);
        };
      })(this));
    } else {
      return sendChunkRequest();
    }
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
      } else if (this.status === 401) {
        oauth.resetAccessToken();
        deferred.reject(new Error("Got permission denied – Is your computer clock correct? – Trying to get a new access token for you."));
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

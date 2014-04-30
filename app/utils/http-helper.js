// Generated by CoffeeScript 1.7.1
(function() {
  var Q, XHRDownloadStream, config, fs, getJson, getToDisk, os, path, post, qs, url, workingFile;

  fs = require("fs");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  url = require("url");

  Q = require("q");

  config = require("../../config/config.js");

  workingFile = require("./working-file.js");

  XHRDownloadStream = require("./xhr-download-stream.js");

  getToDisk = function(targetUrl, opts) {
    var canceller, deferred, destPath, downloadStream, urlParts, writeStream;
    deferred = Q.defer();
    opts = opts || {};
    if (!targetUrl) {
      deferred.reject(new Error("No source url specified."));
    }
    if (opts.accessToken) {
      urlParts = url.parse(targetUrl, true);
      urlParts.query.access_token = opts.accessToken;
      targetUrl = url.format(urlParts);
    }
    canceller = opts.canceller;
    destPath = opts.destPath || workingFile.newTempPlatformArchive();
    downloadStream = new XHRDownloadStream(targetUrl, canceller, config.DownloadChunkSize);
    writeStream = fs.createWriteStream(destPath);
    downloadStream.on('error', function(err) {
      console.warn("Downloading chunk failed: " + (err.stack || err) + " (" + targetUrl + ")");
      return deferred.reject(err);
    });
    writeStream.on('error', function(err) {
      console.warn("Writing chunk failed: " + (err.stack || err) + " (" + destPath + ")");
      return deferred.reject(err);
    });
    writeStream.on('finish', function() {
      return deferred.resolve(destPath.toString());
    });
    downloadStream.on('progress', function(percentComplete) {
      return deferred.notify(percentComplete);
    });
    if (canceller != null) {
      canceller.fin(function() {
        var err;
        err = new Error("Cancelled download of " + targetUrl);
        err.cancelled = true;
        deferred.reject(err);
        return writeStream != null ? writeStream.end(function() {
          try {
            if (fs.existsSync(destPath)) {
              return fs.unlinkSync(destPath);
            }
          } catch (_error) {
            err = _error;
            return console.warn("Could not cleanup cancelled download: " + (err.stack || err));
          }
        })() : void 0;
      });
    }
    downloadStream.pipe(writeStream);
    return deferred.promise;
  };

  getJson = function(targetUrl) {
    return Q(window.$.getJSON(targetUrl)).then(function(json) {
      nwGui.App.clearCache();
      return json;
    });
  };

  post = function(targetUrl, data) {
    var deferred, xhr;
    deferred = Q.defer();
    xhr = new window.XMLHttpRequest();
    xhr.open("POST", targetUrl);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function() {
      nwGui.App.clearCache();
      return deferred.resolve(this.responseText);
    };
    xhr.onerror = function(err) {
      return deferred.reject(err);
    };
    xhr.send(qs.stringify(data));
    return deferred.promise;
  };

  module.exports.getToDisk = getToDisk;

  module.exports.getJson = getJson;

  module.exports.post = post;

}).call(this);

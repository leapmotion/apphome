// Generated by CoffeeScript 1.7.1
(function() {
  var Q, XHRDownloadStream, bytesToMB, checkPath, config, db, diskspace, fs, getJson, getToDisk, i18n, os, path, post, qs, url, workingFile;

  fs = require("fs");

  os = require("os");

  path = require("path");

  qs = require("querystring");

  url = require("url");

  db = require("./db");

  i18n = require("./i18n");

  diskspace = require('./diskspace/diskspace');

  Q = require("q");

  config = require("../../config/config.js");

  workingFile = require("./working-file.js");

  XHRDownloadStream = require("./xhr-download-stream.js");

  checkPath = function(pathToTest) {
    if (os.platform() === 'win32') {
      return pathToTest[0];
    } else {
      return path.dirname(pathToTest);
    }
  };

  bytesToMB = function(bytecount) {
    return Math.round(bytecount / 10485) / 100 + " MB";
  };

  getToDisk = function(targetUrl, opts) {
    var canceller, deferred, destPath, diskFullMessage, downloadStream, finalDir, urlParts, writeStream;
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
    finalDir = opts.finalDir;
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
    console.log('launching getFileSize');
    diskFullMessage = function(fileSize, path, pathFree) {
      return window.alert(i18n.translate('Leap Motion App Home') + ': ' + i18n.translate('Disk full.') + "\n" + i18n.translate('File') + ': ' + bytesToMB(fileSize) + "\n" + checkPath(path) + ": " + bytesToMB(pathFree) + "\n");
    };
    downloadStream.getFileSize().then(function(fileSize) {
      if (finalDir) {
        return diskspace.check(checkPath(destPath), (function(_this) {
          return function(err, total, free, status) {
            return diskspace.check(checkPath(finalDir), function(err2, total2, free2, status2) {
              var er, fileSize2;
              fileSize2 = fileSize * (total === total2 && free === free2 ? 3.3 : 2.3);
              if (fileSize2 > free2 || fileSize > free) {
                if (fileSize2 > free2) {
                  diskFullMessage(fileSize2, finalDir, free2);
                } else {
                  diskFullMessage(fileSize, destPath, free);
                }
                er = new Error(i18n.translate('Disk full.'));
                er.cancelled = true;
                deferred.reject(er);
                return require('./install-manager').cancelAll();
              } else {
                console.log('Need ' + fileSize2 + 'B from final directory, got ' + free2 + ', good to go!');
                return downloadStream.pipe(writeStream);
              }
            });
          };
        })(this));
      } else {
        return downloadStream.pipe(writeStream);
      }
    }).fail(function() {
      return downloadStream.pipe(writeStream);
    });
    return deferred.promise;
  };

  getJson = function(targetUrl) {
    return Q(window.$.getJSON(targetUrl)).then(function(json, e) {
      console.log('getJson', targetUrl, 'result', e);
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

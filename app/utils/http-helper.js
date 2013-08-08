var fs = require('fs');
var http = require('http');
var https = require('https');
var os = require('os');
var path = require('path');
var qs = require('querystring');
var url = require('url');
var req = require('request');

var config = require('../../config/config.js');
var DownloadProgressStream = require('./download-progress-stream.js');
var workingFile = require('./working-file.js');

function isRedirect(serverResponse) {
  return serverResponse.statusCode >= 301 && serverResponse.statusCode <= 303 && serverResponse.headers.location;
}

// gets a URL from the format specified at http://web.archive.org/web/20070602031929/http://wp.netscape.com/eng/mozilla/2.0/relnotes/demo/proxy-live.html
function getProxyURL(sourceUrl) {
  var pac = global.nwGui.App.getProxyForURL(sourceUrl);
  if (pac === 'DIRECT') {
    return;
  } else if (pac.indexOf('SOCKS') !== -1) {
    console.error('SOCKS proxies are not currently supported', pac);
  } else if (pac.indexOf('PROXY ') === 0) {
    var first = pac.split(';')[0];
    if (first.substring(':443'))
    return first.substring(6);
  }
}

function makeRequest(sourceUrl) {
  var proxyurl = getProxyURL(sourceUrl);

  console.log('makeRequest', sourceUrl, proxyurl);
  var req = protocolModuleForUrl(sourceUrl).get(sourceUrl, function(res) {
    console.log('response', res)
    if (isRedirect(res)) {
      req.emit('redirect', res.headers.location);
    } else if (res.statusCode !== 200) {
      req.emit('error', new Error('Got status code: ' + res.statusCode));
    } else {
      res.on('error', function() {
        res.removeAllListeners();
      });

      res.on('cancel', function() {
        res.removeAllListeners();
      });

      res.on('close', function() {
        res.removeAllListeners();
      });

      req.emit('connected', res);
    }
  });

  return req;
}

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

  // req.get(sourceUrl, function (error, res, data) {
  //   if (error) console.dir(error);
  //   console.log('req.get', error, res, data)
  //   progressStream.listenTo(res);
  //   if (progressStream.isFullyDownloaded()) {
  //     cb && cb(null, destPath);
  //   } else {
  //     cb && cb(new Error('Expected: ' + progressStream.totalBytes + ' bytes, but got: ' + progressStream.bytesSoFar + ' bytes.'));
  //   }
  // }).on('response', function(res) {
  //   console.log('created response', res)
  // }).on('request', function(req) {
  //   console.log('created request', req)
  // }).on('redirect', function(url) {
  //   console.log('redirect', url);
  // });
  // return progressStream;

  var fd = fs.openSync(destPath, 'w');
  var chunksize = 1024 * 1024 * 10;
  var position = 0;

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
    canceller && canceller();
  };

  progressStream.setCanceller(cleanup);

  return progressStream;

  // var request = makeRequest(sourceUrl, function(err, data) {
  //   console.log('got data', data);
  // });

  var destStream = fs.createWriteStream(destPath);

  request.on('connected', function(serverResponse) {
    function cleanup() {
      serverResponse.removeAllListeners();
      request.removeAllListeners();
      destStream.removeAllListeners();
    }

    progressStream.listenTo(serverResponse);

    serverResponse.on('cancel', function() {
      cleanup();
      destStream.end();
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
    });

    destStream.on('error', function(err) {
      cleanup();
      cb && cb(err);
      cb = null;
    });

    destStream.on('close', function() {
      cleanup();
      if (progressStream.isFullyDownloaded()) {
          cb && cb(null, destPath);
        } else {
          cb && cb(new Error('Expected: ' + progressStream.totalBytes + ' bytes, but got: ' + progressStream.bytesSoFar + ' bytes.'));
        }
      cb = null;
    });

    serverResponse.pipe(destStream);
  });

  request.on('error', function(err) {
    destStream.end();
    destStream.removeAllListeners();
    request.removeAllListeners();
    cb && cb(err);
    cb = null;
  });

  request.on('redirect', function(newUrl) {
    destStream.end();
    destStream.removeAllListeners();
    request.removeAllListeners();
    getToDisk(newUrl, _({ progressStreamOverride: progressStream }).extend(opts), cb);
  });

  return progressStream;
}

function getJson(url, cb) {
  var responseParts = [];
  req.get(url, function (error, res, data) {
    if (data) data = JSON.parse(data);
    cb(error, data);
  });
  return;

  // var req = makeRequest(url);

  // req.on('connected', function(res) {
  //   res.on('data', function(chunk) {
  //     responseParts.push(chunk);
  //   });
  //   res.on('end', function() {
  //     req.removeAllListeners();
  //     res.removeAllListeners();
  //     try {
  //       cb && cb(null, JSON.parse(responseParts.join('')));
  //     } catch(err) {
  //       cb && cb(err);
  //     } finally {
  //       cb = null;
  //     }
  //   });

  //   res.on('error', function(err) {
  //     req.removeAllListeners();
  //     res.removeAllListeners();
  //     cb && cb(err);
  //     cb = null;
  //   });
  // });

  // req.on('error', function(err) {
  //   req.removeAllListeners();
  //   cb && cb(err);
  //   cb = null;
  // });

  // req.on('redirect', function(newUrl) {
  //   req.removeAllListeners();
  //   getJson(newUrl, cb);
  // });
}

function post(requestUrl, data, cb) {
  global.postData(requestUrl, data, cb);
  return;

  var pac = getProxyURL(requestUrl);
  return req.defaults({proxy: pac}).post(requestUrl, function(error, res, body) {
    if (error) {
      cb && cb(error);
    }
  }).form(data);

  // var urlParts = url.parse(requestUrl);
  // var options = {
  //   hostname: urlParts.hostname,
  //   path: urlParts.pathname,
  //   port: urlParts.port,
  //   auth: urlParts.auth,
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded'
  //   }
  // };

  // var req = protocolModuleForUrl(requestUrl).request(options, function(res) {
  //   if (res.statusCode !== 200) {
  //     req.removeAllListeners();
  //     cb && cb(new Error('Got status code: ' + res.statusCode));
  //     cb = null;
  //   } else {
  //     res.on('error', function(err) {
  //       req.removeAllListeners();
  //       res.removeAllListeners();
  //       cb && cb(err);
  //       cb = null;
  //     });

  //     res.on('end', function() {
  //       req.removeAllListeners();
  //       res.removeAllListeners();
  //       cb && cb(null);
  //       cb = null;
  //     });
  //   }
  // });

  // req.on('error', function(err) {
  //   req.removeAllListeners();
  //   cb && cb(err);
  //   cb = null;
  // });

  // req.end(qs.stringify(data));
}

function protocolModuleForUrl(requestUrl) {
  return (/^https:/i.test(requestUrl) ? https : http);
}

module.exports.getToDisk = getToDisk;
module.exports.getJson = getJson;
module.exports.post = post;

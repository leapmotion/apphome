var async = require('async');
var ws = require('ws');

var config = require('../../config/config.js');

var fakeOauthApp = require('./fake-oauth-server.js');
var fakeWarehouseApp = require('./fake-warehouse.js');
var fakeS3App = require('./fake-s3.js');
var fakeOauthServer;
var fakeWarehouseServer;
var fakeS3Server;
var fakeLeapWebSocketServer;

function startFakeLeapWebSocketServer(cb) {
  console.log('Starting fake leap WebSocket server...');
  fakeLeapWebSocketServer = new ws.Server({ port: 6437 }, cb);
  fakeLeapWebSocketServer.on('error', function() {
    // ignore existing leap service
    console.log('Leap service already running.');
    cb(null);
  });
  fakeLeapWebSocketServer.on('connection', function(ws) {
    var intervalId = setInterval(function() {
      try {
        ws.send('some message');
      } catch (e) {
        clearInterval(intervalId);
      }
    }, 100);
  });
}

function afterServerStart(callback) {
  return function(err) {
    console.log(err ? err.stack || err : 'done.');
    callback(err);
  }
}

function start(cb) {
  async.parallel([
    function(callback) {
      console.log('Starting fake oauth server...');
      fakeOauthServer = fakeOauthApp.listen(9876, afterServerStart(callback));
    },
    function(callback) {
      console.log('Starting fake warehouse server...');
      fakeWarehouseServer = fakeWarehouseApp.listen(9877, afterServerStart(callback));
    },
    function(callback) {
      console.log('Starting fake S3 server...');
      fakeS3Server = fakeS3App.listen(9878, afterServerStart(callback));
    },
    startFakeLeapWebSocketServer
  ], cb);
}

function stop(cb) {
  var closeFuncs = [];
  fakeOauthServer && closeFuncs.push(fakeOauthServer.close.bind(fakeOauthServer));
  fakeWarehouseServer && closeFuncs.push(fakeWarehouseServer.close.bind(fakeWarehouseServer));
  fakeS3Server && closeFuncs.push(fakeS3Server.close.bind(fakeS3Server));
  fakeLeapWebSocketServer && closeFuncs.push(fakeLeapWebSocketServer.close.bind(fakeLeapWebSocketServer));
  async.parallel(closeFuncs, function() {
    console.log('closed all servers');
    fakeOauthServer = fakeWarehouseServer = fakeS3Server = fakeLeapWebSocketServer = null;
    cb.apply(null, arguments);
  });
}

module.exports.start = start;
module.exports.stop = stop;

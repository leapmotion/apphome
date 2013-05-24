var WebSocket = require('ws');

var PollingMs = 250;

var isLeapControllerRunning = false;
var isLeapConnected = false;
var socket;
var timeOfLastMessage;

function now() {
  return (new Date()).getTime();
}

function handleConnectionEnd() {
  socket.removeAllListeners();
  isLeapControllerRunning = isLeapConnected = false;
  setTimeout(checkConnection, PollingMs);
}

function checkConnection() {
  socket = new WebSocket('ws://localhost:6437');

  socket.on('open', function() {
    isLeapControllerRunning = true;
  });

  socket.on('message', function(message) {
    if (/version/.test(message)) {
      // not a real frame
      return;
    }
    isLeapConnected = true;
    timeOfLastMessage = now();
  });

  socket.on('close', handleConnectionEnd);
  socket.on('error', handleConnectionEnd);
}

setInterval(function() {
  if (timeOfLastMessage && now() - timeOfLastMessage > PollingMs) {
    isLeapConnected = false;
  }
}, PollingMs);

checkConnection();

function isControllerRunning() {
  return isLeapControllerRunning;
}

function isConnected() {
  return isLeapConnected;
}

module.exports.isControllerRunning = isControllerRunning;
module.exports.isConnected = isConnected;


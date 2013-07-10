var LeapApp = require('../models/leap-app.js');

var installQueue = [];

function enqueue(app, cb, skipToFront) {
  app.set('state', LeapApp.States.Waiting);
  var queueData = {
    app: app,
    cb: cb
  };
  if (skipToFront && installQueue.length > 0) {
    installQueue.splice(1, 0, queueData);
  } else {
    installQueue.push(queueData);
  }
  if (installQueue.length === 1) {
    dequeue();
  }
}

function dequeue() {
  var queuedItem = installQueue[0];
  if (queuedItem) {
    queuedItem.app.install(function(err) {
      if (!err || err.cancelled) {
        installQueue.shift();
      }
      if (_.isFunction(queuedItem.cb)) {
        queuedItem.cb.apply(this, arguments);
      }
      dequeue();
    });
  }
}

module.exports.enqueue = enqueue;

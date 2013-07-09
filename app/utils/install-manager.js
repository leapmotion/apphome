var LeapApp = require('../models/leap-app.js');

var installQueue = [];

function enqueue(app, cb) {
  app.set('state', LeapApp.States.Waiting);
  installQueue.push({
    app: app,
    cb: cb
  });
  if (installQueue.length === 1) {
    dequeue();
  }
}

function dequeue() {
  var queuedItem = installQueue[0];
  if (queuedItem) {
    queuedItem.app.install(function() {
      installQueue.shift();
      if (_.isFunction(queuedItem.cb)) {
        queuedItem.cb.apply(this, arguments);
      }
      dequeue();
    });
  }
}

module.exports.enqueue = enqueue;

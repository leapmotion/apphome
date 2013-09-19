var mixpanel = require('../utils/mixpanel.js');

var LeapApp = require('../models/leap-app.js');

var MaxConsecutiveFailures = 3;

var installQueue = [];

function enqueue(app, cb, skipToFront) {
  if (app.get('state') === LeapApp.States.Uninstalled) {
    mixpanel.trackAppReinstall();
  }
  app.set('state', LeapApp.States.Waiting);
  var queueData = {
    app: app,
    cb: cb,
    failureCount: 0
  };
  if (skipToFront && installQueue.length > 0) {
    installQueue.splice(1, 0, queueData);
  } else {
    installQueue.push(queueData);
  }
  if (installQueue.length === 1) {
    dequeue();
  }

  if (installQueue.length > 0) {
    console.log('Install Queue length greater than 0.  Showing "cancel all" button');
    $('#download-all').hide();
    $('#cancel-all').show();
  }
}

function dequeue() {
  var queuedItem = installQueue[0];
  if (queuedItem) {
    queuedItem.app.install(function(err) {
      if (err && !err.cancelled) {
        queuedItem.failureCount++;
      }
      var maxFailuresExceeded = (queuedItem.failureCount >= MaxConsecutiveFailures);
      if (!err || err.cancelled || maxFailuresExceeded) {
        if (maxFailuresExceeded) {
          console.warn('Gave up trying to install ' + queuedItem.app.get('name') + ' after ' + queuedItem.failureCount + ' consecutive errors.');
        }
        installQueue.shift();
      }
      if (_.isFunction(queuedItem.cb)) {
        queuedItem.cb.apply(this, arguments);
      }
      if (installQueue.length < 1) {
        $('#cancel-all').hide();
        maybeShowDownloadAll();
      }
      dequeue();
    });
  }
}

function maybeShowDownloadAll(fade) {
  if (uiGlobals.myApps.filter(function(app) {
    return app.get('state') === LeapApp.States.NotYetInstalled;
  }).length > 1) {
    $('#cancel-all').hide();
    if (fade) {
      $('#download-all').fadeIn('slow');
    } else {
      $('#download-all').show();
    }
  } else {
    console.log('Hide download all');
    $('#download-all').hide();
  }
}

function cancelAll() {
  var currentInstall = installQueue[0];
  installQueue.forEach(function(queueData) {
    queueData.app.set('state', LeapApp.States.NotYetInstalled);
  });
  installQueue = [];
  if (currentInstall) {
    currentInstall.app.trigger('cancel-download');
  }
}

module.exports.enqueue = enqueue;
module.exports.cancelAll = cancelAll;
module.exports.maybeShowDownloadAll = maybeShowDownloadAll;

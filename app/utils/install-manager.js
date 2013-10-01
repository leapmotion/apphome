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

  showAppropriateDownloadControl();
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
      showAppropriateDownloadControl();
      dequeue();
    });
  }
}

function showAppropriateDownloadControl(fade) {
  var updates = 0,
      downloads = 0,
      $control;

  $('.download-control').hide();

  uiGlobals.myApps.forEach(function(app) {
    if (app.isUpdatable()) updates++;
    if (app.get('state') === LeapApp.States.NotYetInstalled) downloads++;
  });

  if (installQueue.length > 0) {
    if (fade) {
      $('#cancel-all').fadeIn('slow');
    } else {
      $('#cancel-all').show();
    }
    return;
  } else if (updates) {
    $control = $('#update-all');
  } else if (downloads) {
    $control = $('#download-all');
  }

  if ($control) {
    if (fade) {
      $control.fadeIn('slow');
    } else {
      $control.show();
    }
  }
}

function cancelAll() {
  installQueue.forEach(function(queueData) {
    queueData.app.trigger('cancel-download');
  });
  installQueue = [];
}

module.exports.enqueue = enqueue;
module.exports.cancelAll = cancelAll;
module.exports.showAppropriateDownloadControl = showAppropriateDownloadControl;

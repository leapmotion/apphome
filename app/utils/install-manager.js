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
      queuedItem.app.off('change:state', showAppropriateDownloadControl);
      showAppropriateDownloadControl();
      if (_.isFunction(queuedItem.cb)) {
        queuedItem.cb.apply(this, arguments);
      }
      dequeue();
    });
    queuedItem.app.on('change:state', showAppropriateDownloadControl);
  }
}

function showAppropriateDownloadControl(fade) {
  var updates = 0;
  var downloads = 0;
  var downloading = 0;
  var $control;

  $('.download-control').hide();

  uiGlobals.myApps.forEach(function(app) {
    var appState = app.get('state');
    if (app.isUpdatable()) {
      updates++;
    } else if (appState === LeapApp.States.NotYetInstalled) {
      downloads++;
    } else if (appState === LeapApp.States.Waiting ||
               appState === LeapApp.States.Connecting ||
               appState === LeapApp.States.Downloading) {
      downloading++;
    }
  });

  if (installQueue.length > 0) {
    if (downloading > 0) {
      if (fade === true) {
        $('#cancel-all').fadeIn('slow');
      } else {
        $('#cancel-all').show();
      }
    }
  } else if (updates > 0) {
    $control = $('#update-all');
  } else if (downloads > 0) {
    $control = $('#download-all');
  }

  if ($control) {
    if (fade === true) {
      $control.fadeIn('slow');
    } else {
      $control.show();
    }
  }
}

function cancelAll() {
  // Reset waiting apps
  for (var i = 0, len = installQueue.length; i < len - 1; i++) {
    var app = installQueue.pop().app;
    if (app.hasUpdate() && app.get('state') === LeapApp.States.Waiting) {
      app.set('state', LeapApp.States.Ready);
    } else {
      app.set('state', LeapApp.States.NotYetInstalled);
    }
  }

  // Cancel current download, if possible
  if (installQueue.length) {
    installQueue[0].app.trigger('cancel-download');
  }
}

module.exports.enqueue = enqueue;
module.exports.cancelAll = cancelAll;
module.exports.showAppropriateDownloadControl = showAppropriateDownloadControl;

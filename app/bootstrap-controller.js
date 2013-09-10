var async = require('async');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');

var api = require('./utils/api.js');
var authorizationUtil = require('./utils/authorization-util.js');
var config = require('../config/config.js');
var crashCounter = require('./utils/crash-counter.js');
var db = require('./utils/db.js');
var embeddedLeap = require('./utils/embedded-leap.js');
var enumerable = require('./utils/enumerable.js');
var eula = require('./utils/eula.js');
var firstRunView = require('./views/first-run/first-run.js');
var frozenApps = require('./utils/frozen-apps.js');
var mixpanel = require('./utils/mixpanel.js');
var shell = require('./utils/shell.js');
var windowChrome = require('./utils/window-chrome.js');
var workingFile = require('./utils/working-file.js');

var LeapApp = require('./models/leap-app.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');
var LocalLeapApp = require('./models/local-leap-app.js');

function wrappedSetTimeout(task, ms) {
  setTimeout(function() {
    try {
      task();
    } catch (err) {
      console.error('Asynchronous task failed: ' + (err.stack || err));
    }
  }, ms);
}

function bootstrapAirspace() {
  var steps = [
    ensureWorkingDirs,
    prerunAsyncKickoff,
    firstRun,
    setupMainWindow,
    checkLeapConnection,
    localTiles,
    startMainApp,
    afterwardsAsyncKickoffs
  ];

  steps.forEach(function(step) {
    uiGlobals.bootstrapPromises[step.name] = new $.Deferred();
  });

  var wrappedSteps =  _(steps).map(function(fn, key) {
    return function(cb) {
      console.log('~~~ Bootstrap Step: ' + fn.name + ' ~~~ ');
      fn.call(null, function() {
        uiGlobals.bootstrapPromises[fn.name].resolve();
        cb.apply(this, arguments);
      });
    }
  });
  async.series(wrappedSteps, function(err) {
    if (err) {
      console.error('Error bootstrapping airspace: ' + (err.stack || err));
      process.exit();
    } else {
      mixpanel.trackOpen({
        bootstrapDurationMs: (new Date()).getTime() - window.appStartTime
      });
    }
  });
}

function ensureWorkingDirs(cb) {
  var dirFn = function(dirpath) {
    return function(next) {
      workingFile.ensureDir(dirpath, next);
    };
  };

  var appDataDir = path.join((config.PlatformDirs[os.platform()] || ''), 'Airspace', 'AppData');
  var tempDir = config.PlatformTempDirs[os.platform()];
  var leapSharedData = config.PlatformLeapDataDirs[os.platform()];
  // todo: PlatformUserDataDirs, '__userDataDir' and '__userDataDir'  (cleanup store-leap-app.js)

  async.series([
    dirFn(appDataDir),
    dirFn(tempDir),
    dirFn(leapSharedData)
  ], function(err) {
    cb && cb(err);
  });
}

function prerunAsyncKickoff(cb) {
  uiGlobals.isFirstRun = !db.getItem(config.DbKeys.AlreadyDidFirstRun);
  workingFile.buildCleanupList();
  LeapApp.hydrateCachedModels();
  embeddedLeap.embeddedLeapPromise();
  LocalLeapApp.localManifestPromise();
  windowChrome.rebuildMenuBar(false);
  cb && cb(null);
}

function firstRun(cb) {
  if (!uiGlobals.isFirstRun) {
    cb && cb(null);
  } else {
    firstRunView.showFirstRunSequence(cb);
  }
}

function setupMainWindow(cb) {
  windowChrome.maximizeWindow();
  window.setTimeout(function() { // what's this for? todo: move to an explicit step at end?
    $('body').removeClass('startup');
  }, 50);

  cb && cb(null);
}

function checkLeapConnection(cb) {
  embeddedLeap.embeddedLeapPromise().done(function(isEmbedded) {
    var leapNotConnectedView = new LeapNotConnectedView({ isEmbedded: isEmbedded });
    leapNotConnectedView.encourageConnectingLeap(function() {
      leapNotConnectedView.remove();
    });
    cb && cb(null);
  });
}

function localTiles(cb) {
  AsyncTasks.scanForLocalApps();
  cb && cb(null);
}

function startMainApp(cb) {
  AsyncTasks.authorizeAndPaintMainScreen();
  cb && cb(null);
}

function afterwardsAsyncKickoffs(cb) {
  wrappedSetTimeout(frozenApps.get, 10);
  wrappedSetTimeout(workingFile.cleanup, 4000);
  cb && cb(null);
}


var AsyncTasks = {

  scanForLocalApps: function() {
    LocalLeapApp.localManifestPromise().done(function(manifest) {
      if (manifest) {
        // Fire this fast, so the Orientation tile shows up at the top of the list.
        LocalLeapApp.explicitPathAppScan(manifest);

        // This is less urgent; give other bootstrap tasks a chance to complete.
        wrappedSetTimeout(function() {
          LocalLeapApp.localAppScan(manifest);
        }, 6000);
      } else {
        console.warn('Manifest missing, skipping local tiles.');
      }
    });
  },

  authorizeAndPaintMainScreen: function() {
    authorizationUtil.withAuthorization(function(err) {
      if (err) {
        setTimeout(AsyncTasks.authorizeAndPaintMainScreen, 50); // Keep on trying...
      } else {
        AsyncTasks.afterAuthorizionComplete();
      }
    });
  },

  afterAuthorizionComplete: function() {
    console.log('Authorization complete. Painting main page');
    uiGlobals.isFirstRun = false; // todo: remove this. First run should remain constant throughout app's first run. check AlreadyDidFirstRun elsewhere if needed
    db.setItem(config.DbKeys.AlreadyDidFirstRun, true);
    $('body').addClass('loading');
    windowChrome.paintMainPage();
    crashCounter.reset();
    setInterval(AsyncTasks.scanForLocalApps, config.FsScanIntervalMs);

    try {
      api.sendDeviceData();
    } catch (err) {
      console.error('Failed to send device data: ' + (err.stack + err));
    }
    api.connectToStoreServer();
  }

};

module.exports.run = bootstrapAirspace;

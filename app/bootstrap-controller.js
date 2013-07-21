var async = require('async');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');

var api = require('./utils/api.js');
var authorization = require('./utils/authorization.js');
var config = require('../config/config.js');
var db = require('./utils/db.js');
var enumerable = require('./utils/enumerable.js');
var frozenApps = require('./utils/frozen-apps.js');
var leap = require('./utils/leap.js');
var mixpanel = require('./utils/mixpanel.js');
var crashCounter = require('./utils/crash-counter.js');
var shell = require('./utils/shell.js');
var workingFile = require('./utils/working-file.js');
var eula = require('./utils/eula.js');
var windowChrome = require('./utils/window-chrome.js');
var embeddedLeap = require('./utils/embedded-leap.js');
var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');
var LeapNotConnectedView = require('./views/leap-not-connected/leap-not-connected.js');
var firstRunView = require('./views/first-run/first-run.js');


function prerunAsyncKickoff(cb) {
  uiGlobals.isFirstRun = !db.getItem(config.DbKeys.AlreadyDidFirstRun);
  workfingFile.buildCleanupList();
  LeapApp.hydrateCachedModels();
  embeddedLeap.embeddedLeapPromise();
  AsyncTasks.localAppFileSystemScan();
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

function startMainApp(cb) {
  AsyncTasks.authorizeAndPaintMainScreen();
  cb && cb(null);
}

function afterwardsAsyncKickoffs(cb) {
  var stacked = function(task, ms) {
    try {
      setTimeout(task, ms);
    } catch (err) {
      console.error('postStartAsyncKickoff stacked task failed: ' + (err.stack || err));
    }
  };
  stacked(frozenApps.get, 10);
  stacked(workingFile.cleanup, 4000);
  cb && cb(null);
}


function bootstrapAirspace() {
  var steps = [
    prerunAsyncKickoff,
    firstRun,
    setupMainWindow,
    checkLeapConnection,
    startMainApp,
    afterwardsAsyncKickoffs
  ];

  var wrappedSteps =  _(steps).map(function(fn, key) {
    return function(cb) {
      console.log('~~~ Bootstrap Step: ' + fn.name + ' ~~~ ');
      fn.call(null, cb);
    }
  });
  async.series(wrappedSteps, function(err) {
    if (err) {
      console.error('Error bootstrapping airspace: ' + (err.stack || err));
      process.exit();
    }
  });
}



var AsyncTasks = {

  registerLocalAppManifest: function() {

  },

  localAppFileSystemScan: function() {
    console.log('Scanning filesystem for apps.');
    api.getLocalAppManifest(function(err, manifest) {
      if (err) {
        return;
      }
      LocalLeapApp.localAppScan(manifest);
      LocalLeapApp.explicitPathAppScan(manifest);
    });
  },

  authorizeAndPaintMainScreen: function() {
    authorization.withAuthorization(function(err) {
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
    setInterval(AsyncTasks.localAppFileSystemScan, config.FsScanIntervalMs);

    try {
      api.sendDeviceData();
    } catch (err) {
      console.error('Failed to send device data: ' + (err.stack + err));
    }
    api.connectToStoreServer();
  }

};

module.exports.tmpBah = 4;
module.exports.run = bootstrapAirspace;

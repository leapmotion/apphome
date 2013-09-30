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
var frozenApps = require('./utils/frozen-apps.js');
var i18n = require('./utils/i18n.js');
var migrations = require('./utils/migrations.js');
var mixpanel = require('./utils/mixpanel.js');
var popup = require('./views/popups/popup.js');
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
    initializeMixpanel,
    initializeInternationalization,
    ensureWorkingDirs,
    migrateDatabase,
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
    };
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

/*
 * Get the mixpanel id written during install time and use it
 */
function initializeMixpanel(cb) {
  mixpanel.initialize(cb);
}

/*
 * Figure out the user's locale
 */
function initializeInternationalization(cb) {
  i18n.initialize(function(err, locale) {
    console.log(err ? 'Error determining locale: ' + (err.stack || err) : 'Determined locale: ' + locale);
    cb.apply(this, arguments);
  });
}

/*
 * Check if the main directories used by Airspace Home do, in fact, exist
 */
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

function migrateDatabase(cb) {
  migrations.migrate();

  cb && cb(null);
}

function prerunAsyncKickoff(cb) {
  uiGlobals.isFirstRun = !db.getItem(config.DbKeys.AlreadyDidFirstRun);

  // Gather all temp files that weren't cleaned up from last time immediately
  // and delete them once we're idle
  workingFile.cleanupTempFiles();

  // Read the db and populate uiGlobals.myApps and uiGlobals.uninstalledApps
  // based on the json and information in the database.
  // myApps tries to install everything that gets added (that has state NotYetInstalled)
  LeapApp.hydrateCachedModels();

  // Check if device has an embedded leap or not.
  // Checks db first to see if there's a stored value
  embeddedLeap.embeddedLeapPromise();

  // Creates manifest promise for future use
  // manifest is fetched from config.NonStoreAppManifestUrl
  // Contains information on Store, Orientation, Google Earth, etc.
  LocalLeapApp.localManifestPromise();

  // Builds the menu bar
  // TODO move this to setupMainWindow?
  windowChrome.rebuildMenuBar(false);
  cb && cb(null);
}

function firstRun(cb) {
  if (!uiGlobals.isFirstRun) {
    cb && cb(null);
  } else {
    var firstRunPopup = popup.open('first-run');
    firstRunPopup.on('close', function() {
      firstRunPopup.close(true);
      cb && cb(null);
    });
  }
}

function setupMainWindow(cb) {
  if (global.splashWindow) {
    global.splashWindow.hide();
  }
  windowChrome.maximizeWindow();

  // TODO: move to an explicit step at end?
  window.setTimeout(function() {
    $('body').removeClass('startup');
  }, 0);

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

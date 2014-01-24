var async = require('async');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');
var fs = require('fs');

var Q = require('q');
var qfs = require('q-io/fs');

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
var shell = require('./utils/shell.js');
var oauth = require('./utils/oauth.js');
var tutorial = require('./utils/tutorial.js');
var windowChrome = require('./utils/window-chrome.js');
var workingFile = require('./utils/working-file.js');

var FirstRun = require('./views/popups/first-run/first-run.js');
var LeapApp = require('./models/leap-app.js');
var LocalLeapApp = require('./models/local-leap-app.js');
var WebLinkApp = require('./models/web-link-app.js');

function run() {
  var steps = [
    getConfiguration,
    initializeMixpanel,
    initializeInternationalization,
    ensureWorkingDirs,
    migrateDatabase,
    prerunAsyncKickoff,
    setupMainWindow,
    doFirstRun,
    authorize,
    startMainApp,
    cleanup
  ];

  steps.forEach(function(step) {
    uiGlobals.bootstrapPromises[step.name] = new $.Deferred();
  });

  var startupTimings = {};

  var wrappedSteps =  _(steps).map(function(fn, key) {
    return function(cb) {
      startupTimings[fn.name] = Date.now();
      console.log('~~~ Bootstrap Step: ' + fn.name + ' ~~~ ');
      fn.call(null, function() {
        console.log('### Step: ' + fn.name + ' done in ' + (Date.now() - startupTimings[fn.name]) + 'ms ###');
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
        bootstrapDurationMs: (new Date()).getTime() - window.appStartTime,
        windowWidth: $(window).width(),
        windowHeight: $(window).height()
      });
    }
  });
}

/*
 * Get global config variables
 */
function getConfiguration(cb) {
  // Check if device has an embedded leap or not.
  // Checks db first to see if there's a stored value
  uiGlobals.embeddedDevice = embeddedLeap.getEmbeddedDevice();

  uiGlobals.isFirstRun = !db.getItem(config.DbKeys.AlreadyDidFirstRun);

  var platformConfigFile = path.join(config.PlatformLeapDataDirs[os.platform()], 'config.json');
  if (fs.existsSync(platformConfigFile)) {
    qfs.read(platformConfigFile).then(function (contents) {
      var config;
      try {
        config = JSON.parse(contents).configuration;
      } catch (e) {
        console.warn("Improperly configured platform config file.  Assuming metrics reporting enabled.");
      }

      if (config.metrics_enable === false) {
        uiGlobals.metricsDisabled = true;
      }
    }).done();
  }

  cb && cb(null);
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
    dirFn(leapSharedData),
    workingFile.cleanupTempFiles
  ], function(err) {
    cb && cb(err);
  });
}

function migrateDatabase(cb) {
  migrations.migrate();
  cb && cb(null);
}

function prerunAsyncKickoff(cb) {
  // Read the db and populate uiGlobals.myApps and uiGlobals.uninstalledApps
  // based on the json and information in the database.
  // myApps tries to install everything that gets added (that has state NotYetInstalled)
  LeapApp.hydrateCachedModels();

  // Creates manifest promise for future use
  // manifest is fetched from config.NonStoreAppManifestUrl
  // Contains information on Store, Orientation, Google Earth, etc.
  api.getNonStoreManifest().then(function(manifest) {
    WebLinkApp.createWebAppsFromManifest(manifest.web);
    LocalLeapApp.createLocalAppsFromManifest(manifest.local);
  }, function(reason) {
    console.warn('Failed to get non-store manifest', reason);
  }).done();

  // Creates manifest promise for future use
  // Manifest is fetched by unzipping the prebundled apps
  // Contains information on HP prebundled applications
  if (uiGlobals.isFirstRun && uiGlobals.embeddedDevice){
    frozenApps.prebundledManifestPromise();
  }

  cb && cb(null);
}

function setupMainWindow(cb) {
  // Builds the menu bar
  windowChrome.rebuildMenuBar(false);
  windowChrome.maximizeWindow();

  cb && cb(null);
}

function doFirstRun(cb) {
  if (!uiGlobals.isFirstRun) {
    cb && cb(null);
  } else {
    var firstRunView = new FirstRun({
      onLoggedIn: function() {
        cb && cb(null);
      }
    });
  }
}

function authorize(cb) {
  authorizationUtil.withAuthorization(function(err) {
    if (err) {
      setTimeout(authorize, 50); // Keep on trying...
    } else {
      cb && cb(null);
    }
  });
}

function startMainApp(cb) {
  $('body').removeClass('startup');
  $('body').addClass('loading');

  windowChrome.paintMainPage();

  if (uiGlobals.isFirstRun) {
    tutorial.start();
  }

  // Completely install our prebundled apps before connecting to the store server
  var p;
  if (uiGlobals.isFirstRun && uiGlobals.embeddedDevice) {
    p = handlePrebundledApps()
      .then(api.sendDeviceData)
      .then(api.connectToStoreServer);
  } else {
    p = Q(api.connectToStoreServer())
      .then(api.sendDeviceData);
  }

  p.nodeify(cb);

  p.then(api.sendAppVersionData);
}

function handlePrebundledApps() {
  return frozenApps.prebundledManifestPromise().then(function(manifest) {
    if (manifest) {
      return Q.nfcall(api.parsePrebundledManifest, manifest);
    } else {
      console.warn('Prebundled manifest missing, skipping prebundled apps.');
    }
  }, function(reason) {
    console.log('Skipping prebundled apps: ' + reason);
  });
}

function cleanup(cb) {
  crashCounter.reset();
  db.setItem(config.DbKeys.AlreadyDidFirstRun, true);
  cb && cb(null);
}

module.exports.run = run;

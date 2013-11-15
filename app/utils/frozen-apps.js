var fs = require('fs-extra');
var os = require('os');
var path = require('path');

var api = require('./api.js');
var config = require('../../config/config.js');
var db = require('./db.js');
var extract = require('./extract.js');


var _manifestPromise;
function prebundledManifestPromise() {
  if (_manifestPromise) {
    return _manifestPromise;
  }
  var defer = $.Deferred();
  _manifestPromise = defer.promise();

  var originalManifest = db.getItem(config.DbKeys.OriginalPrebundlingManifest);
  if (originalManifest) {
    console.log(originalManifest);
    defer.resolve(JSON.parse(originalManifest));
  } else {
    _getFrozenApps(function(err, manifest) {
      console.log('Unzipped frozen apps: ' + err + manifest);
      if (err) {
        defer.reject(err);
      } else {
        defer.resolve(manifest);
      }
    });
  }

  return _manifestPromise;
}

function _getFrozenApps(cb) {
  if (db.getItem(config.PrebundlingComplete)) {
    console.log('Prebundled apps already extracted.');
    return cb('Prebundled apps already extracted');
  }
  
  console.log('Expanding prebundled apps');

  var freezeDriedBundlePath = _(config.FrozenAppPaths).find(function(bundlePath) {
    try {
      console.log('Looking for prebundled path in: ' + bundlePath);
      return fs.existsSync(bundlePath);
    } catch (err) {
      console.log('Prebundle path does not exist: ' + bundlePath);
      return false;
    }
  });
  if (freezeDriedBundlePath) {
    console.log('\n\n\nFound freeze-dried preBundle: ' + freezeDriedBundlePath);
    _expandFreezeDriedApps(freezeDriedBundlePath, function(err, manifest) {
      if (err) {
        console.error('Failed to expand prebundle. ' + (err.stack || err));
        cb && cb(new Error('Failed to expand prebundle.'));
      } else if (manifest) {
        try {
          db.setItem(config.PrebundlingComplete, true);
          cb && cb(null, manifest);
        } catch (installErr) {
          console.error('Failed to initialize prebundled apps. ' + (installErr.stack || installErr));
          cb && cb(new Error('Failed to initialize prebundled apps.'));
        }
      } else {
        console.error('Found prebundle but manifest is missing.');
        cb && cb(new Error('Found prebundle but manifest is missing.'));
      }
    });
  } else {
    console.log('No prebundle on this system.');
    cb && cb(new Error('No prebundle on this system.'));
  }
}

function _expandFreezeDriedApps(bundlePath, cb) {
  var dest = path.join(config.PlatformTempDirs[os.platform()], 'frozen');
  var manifest;

  extract.unzip(bundlePath, dest, true, function(err) {
    if (err) {
      console.error('Failed to unzip ' + bundlePath + ': ' + (err.stack || err));
      cb && cb(err);
    } else {
      console.info('Unzipped prebundled apps at ' + bundlePath + ' to ' + dest);
      try {
        console.log('Looking for prebundle manifest at ' + path.join(dest, 'myapps.json'));
        manifest = JSON.parse(fs.readFileSync(path.join(dest, 'myapps.json'), { encoding: 'utf8' }));
        if (manifest) {
          console.log('Caching prebundled manifest ' + JSON.stringify(manifest));
          //May need this to fix a bug (server does not know of entitlement for prebundled app. Lets you upgrade but does not let you run it.)
          db.setItem(config.DbKeys.OriginalPrebundlingManifest, JSON.stringify(manifest));
          cb && cb(null, manifest);
        } else {
          cb && cb(new Error('No freeze dried apps manifest found.'));
        }
      } catch (err) {
        console.error('Corrupt myapps.json prebundled manifest: ' + (err.stack || err));
        cb && cb(err);
      }
    }
  });
}

module.exports.prebundledManifestPromise = prebundledManifestPromise;

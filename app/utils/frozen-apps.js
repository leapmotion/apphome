var fs = require('fs-extra');
var os = require('os');
var path = require('path');

var api = require('./api.js');
var config = require('../../config/config.js');
var db = require('./db.js');
var extract = require('./extract.js');

function getFrozenApps(cb) {
  if (db.getItem(config.PrebundlingComplete)) {
    console.log('Prebundled apps already extracted.');
    cb && cb(null);
    return;
  }

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
      } else if (manifest) {
        try {
          api.parsePrebundledManifest(manifest);
          db.setItem(config.PrebundlingComplete, true);
        } catch (installErr) {
          console.error('Failed to initialize prebundled apps. ' + (installErr.stack || installErr));
        }
      } else {
        console.error('Found prebundle but manifest is missing.');
      }
      cb && cb(null);
    });
  } else {
    console.log('No prebundle on this system.');
    cb && cb(null);
  }
}

function _expandFreezeDriedApps(bundlePath, cb) {
  var dest = path.join(config.PlatformTempDirs[os.platform()], 'frozen');
  var manifest;

  extract.unzip(bundlePath, dest, function(err) {
    if (err) {
      console.error('Failed to unzip ' + bundlePath + ': ' + (err.stack || err));
      cb && cb(null, manifest);
    } else {
      console.info('Unzipped prebundled apps at ' + bundlePath + ' to ' + dest);
      try {
        console.log('Looking for prebundle manifest at ' + path.join(dest, 'myapps.json'));
        manifest = JSON.parse(fs.readFileSync(path.join(dest, 'myapps.json'), { encoding: 'utf8' }));
        if (manifest) {
          console.log('Caching prebundled manifest ' + JSON.stringify(manifest));
          // May need this to fix a bug (server does not know of entitlement for prebundled app. Lets you upgrade but does not let you run it.)
          //    db.setItem(PreBundle.OriginalManifest, manifest);
        }
        cb && cb(null, manifest);
      } catch (err) {
        console.error('Corrupt myapps.json prebundled manifest: ' + (err.stack || err));
        cb && cb(err);
      }
    }
  });
}

module.exports.get = getFrozenApps;

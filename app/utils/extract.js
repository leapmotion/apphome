var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var plist = require('plist');
var Zip = require('adm-zip');

var shell = require('./shell.js');

function extractZip(src, dest, cb) {
  var zip = new Zip(src);
  zip.extractAllTo(dest);
  cb(null);
}

function extractDmg(src, dest, cb) {
  if (os.platform() !== 'darwin') {
    return cb(new Error('Extracting DMG is only supported on Mac OS X.'));
  }

  exec('hdiutil mount ' + shell.escape(src) + ' -plist', function(err, stdout) {
    if (err) {
      return cb(err);
    }

    var mountPoint;
    try {
      var parsedOutput = plist.parseStringSync(stdout.toString());
      var systemEntities = parsedOutput['system-entities'];
      for (var i = 0, len = systemEntities.length; i < len; i++) {
        var systemEntity = systemEntities[i];
        if (systemEntity['mount-point']) {
          mountPoint = systemEntity['mount-point'];
          break;
        }
      }
    } catch (err2) {
      return cb(err2);
    }

    if (!mountPoint) {
      return cb(new Error('Mounting disk image failed.'));
    }

    var dirEntries = fs.readdirSync(mountPoint);
    var appPackage;
    for (var i = 0, len = dirEntries.length; i < len; i++) {
      var dirEntry = path.join(mountPoint, dirEntries[i]);
      if (/\.app$/i.test(dirEntry) && fs.statSync(dirEntry).isDirectory()) {
        if (appPackage) {
          return cb(new Error('Multiple .app directories encountered in DMG: ' + appPackage + ', ' + dirEntry));
        } else {
          appPackage = dirEntry;
        }
      }
    }

    if (!appPackage) {
      return cb(new Error('No .app directory found in DMG.'));
    }

    fs.copy(appPackage, dest, function(err) {
      if (err) {
        return cb(err);
      }
      exec('hdiutil unmount ' + shell.escape(mountPoint), cb);
    });
  });
}

module.exports.unzip = extractZip;
module.exports.undmg = extractDmg;


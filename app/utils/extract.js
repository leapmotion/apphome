var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var plist = require('plist');
var unzip = require('unzip');

var shell = require('./shell.js');

function extractZip(src, dest, cb) {
  try {
    if (fs.existsSync(dest)) {
      fs.deleteSync(dest);
    }
    fs.mkdirSync(dest);
  } catch (err) {
    return cb(err);
  }
  var unzipper = unzip.Extract({
    path: dest,
    verbose: true,
    chunkSize: 20 * 1024 * 1024 // 20 MB
  });
  unzipper.on('error', cb);
  unzipper.on('close', function() {
    var extractedFiles = fs.readdirSync(dest);
    if (extractedFiles.length === 1 && fs.statSync(path.join(dest, extractedFiles[0])).isDirectory()) {
      // application has a single top-level directory, so pull the contents out of that
      var topLevelDir = path.join(dest, extractedFiles[0]);
      fs.readdirSync(topLevelDir).forEach(function(appFile) {
        fs.renameSync(path.join(topLevelDir, appFile), path.join(dest, appFile));
      });
      fs.rmdirSync(topLevelDir);
    }
    cb(null);
  });
  fs.createReadStream(src).pipe(unzipper);
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

    function unmount(callback) {
      exec('hdiutil unmount -force ' + shell.escape(mountPoint), callback);
    }

    var dirEntries = fs.readdirSync(mountPoint);
    var appPackage;
    for (var i = 0, len = dirEntries.length; i < len; i++) {
      var dirEntry = path.join(mountPoint, dirEntries[i]);
      if (/\.app$/i.test(dirEntry) && fs.statSync(dirEntry).isDirectory()) {
        if (appPackage) {
          unmount(function() {
            cb(new Error('Multiple .app directories encountered in DMG: ' + appPackage + ', ' + dirEntry));
          });
        } else {
          appPackage = dirEntry;
        }
      }
    }

    if (!appPackage) {
      unmount(function() {
        cb(new Error('No .app directory found in DMG.'));
      });
    } else {
      try {
        if (fs.existsSync(dest)) {
          fs.deleteSync(dest);
        }
      } catch(err2) {
        return unmount(function() {
          cb(err2);
        });
      }
      console.log('Installing app from ' + appPackage + ' to ' + dest);

      exec('cp -r ' + shell.escape(appPackage) + ' ' + shell.escape(dest), function(err) {
        unmount(function(err2) {
          cb(err || err2 || null);
        });
      });
    }
  });
}

module.exports.unzip = extractZip;
module.exports.undmg = extractDmg;


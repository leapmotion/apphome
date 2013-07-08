var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var plist = require('plist');

var IgnoredWindowsFileRegex = /^\.|^__macosx$/i;

var shell = require('./shell.js');

function extractZip(src, dest, cb) {
  try {
    if (fs.existsSync(dest)) {
      fs.deleteSync(dest);
    }
  } catch (err) {
    console.warn('Error deleting directory "' + dest + '": ' + err.message);
  }

  fs.mkdirpSync(dest);

  unzip(src, dest, function(err) {
    if (err) {
      return cb(err);
    }
    var extractedFiles = fs.readdirSync(dest);
    var possibleAppDirs = [];
    extractedFiles.forEach(function(extractedFile) {
      if (!IgnoredWindowsFileRegex.test(extractedFile)) {
        possibleAppDirs.push(extractedFile);
      }
    });
    if (possibleAppDirs.length === 1 && fs.statSync(path.join(dest, possibleAppDirs[0])).isDirectory()) {
      // application has a single top-level directory, so pull the contents out of that
      var topLevelDir = path.join(dest, possibleAppDirs[0]);
      fs.readdirSync(topLevelDir).forEach(function(appFile) {
        fs.renameSync(path.join(topLevelDir, appFile), path.join(dest, appFile));
      });
      fs.rmdirSync(topLevelDir);
    }
    cb(null);
  });
}

function unzip(src, dest, cb) {
  exec(shell.escape(path.join(__dirname, '..', '..', 'bin', 'unzip.exe')) + ' -o ' + shell.escape(src) + ' -d ' + shell.escape(dest), function(err) {
    if (err) {
      return cb(err);
    }
    cb(null);
  });
}

function extractDmg(src, dest, cb) {
  if (os.platform() !== 'darwin') {
    return cb(new Error('Extracting DMG is only supported on Mac OS X.'));
  }

  exec('hdiutil mount -nobrowse ' + shell.escape(src) + ' -plist', function(err, stdout) {
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

      fs.mkdirpSync(path.dirname(dest));

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
module.exports.unzipfile = unzip;
module.exports.undmg = extractDmg;


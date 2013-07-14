var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var plist = require('plist');

var IgnoredWindowsFileRegex = /^\.|^__macosx$/i;

var shell = require('./shell.js');

function extractZip(src, dest, cb) {
  // TODO: use async io here
  try {
    if (fs.existsSync(dest)) {
      fs.deleteSync(dest);
    }
    fs.mkdirpSync(dest);
  } catch (err) {
    console.warn('Error deleting directory "' + dest + '": ' + (err.stack || err));
    return cb && cb(err);
  }

  unzip(src, dest, function(err) {
    if (err) {
      return cb && cb(err);
    }
    try {
      var extractedFiles = fs.readdirSync(dest);
      var possibleAppDirs = [];
      extractedFiles.forEach(function (extractedFile) {
        if (!IgnoredWindowsFileRegex.test(extractedFile)) {
          possibleAppDirs.push(extractedFile);
        }
      });
      if (possibleAppDirs.length === 1 && fs.statSync(path.join(dest, possibleAppDirs[0])).isDirectory()) {
        // application has a single top-level directory, so pull the contents out of that
        var topLevelDir = path.join(dest, possibleAppDirs[0]);
        fs.readdirSync(topLevelDir).forEach(function (appFile) {
          fs.renameSync(path.join(topLevelDir, appFile), path.join(dest, appFile));
        });
        fs.rmdirSync(topLevelDir);
      }
    } catch (err) {
      cb && cb(err);
    }
    cb(null);
  });
}


function unzip(src, dest, cb) {
  var command = shell.escape(path.join(__dirname, '..', '..', 'bin', 'unzip.exe')) + ' -o ' + shell.escape(src) + ' -d ' + shell.escape(dest);
  console.log('\n\nUsing shell to unzip: ' + command);
  exec(command, cb);
}

function extractDmg(src, dest, cb) {
  if (os.platform() !== 'darwin') {
    return cb && cb(new Error('Extracting DMG is only supported on Mac OS X.'));
  }

  exec('hdiutil mount -nobrowse ' + shell.escape(src) + ' -plist', function(err, stdout) {
    if (err) {
      return cb && cb(err);
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
      return cb && cb(err2);
    }

    if (!mountPoint) {
      return cb && cb(new Error('Mounting disk image failed.'));
    }

    function unmount(callback) {
      exec('hdiutil unmount -force ' + shell.escape(mountPoint), callback);
    }

    try {
      var dirEntries = fs.readdirSync(mountPoint);
    } catch (readErr) {
      console.error('Failed to read mount point');
      return cb && cb(readErr);
    }
    var appPackage;
    for (var i = 0, len = dirEntries.length; i < len; i++) {
      var dirEntry = path.join(mountPoint, dirEntries[i]);
      try {
        var isValidDir = /\.app$/i.test(dirEntry) && fs.statSync(dirEntry).isDirectory();
      } catch (dirErr) {
        isValidDir = false;
      }
      if (isValidDir) {
        if (appPackage) {
          unmount(function () {
            cb && cb(new Error('Multiple .app directories encountered in DMG: ' + appPackage + ', ' + dirEntry));
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
          cb && cb(err2);
        });
      }

      try {
        fs.mkdirpSync(path.dirname(dest));
      } catch (mkdirErr) {
        return cb && cb(mkdirErr);
      }

      console.log('Installing app from ' + appPackage + ' to ' + dest);

      exec('cp -r ' + shell.escape(appPackage) + ' ' + shell.escape(dest), function(err) {
        if (err) {
          unmount(function(err2) {
            cb && cb(err || err2 || null);
          });
        } else {
          exec('xattr -d com.apple.quarantine ' + shell.escape(dest), function(err2) {
            unmount(function(err3) {
              cb && cb(err2 || err3 || null);
            });
          });
        }
      });
    }
  });
}

module.exports.unzip = extractZip;
module.exports.unzipfile = unzip;
module.exports.undmg = extractDmg;


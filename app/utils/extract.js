var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var plist = require('plist');

var shell = require('./shell.js');

var IgnoredWindowsFileRegex = /^\.|^__macosx$/i;
var MaxChildProcessBufferSize = 1024 * 1024 * 5; // 5 MB

function unzip(src, dest, cb, legacy) {
  if (os.platform() === 'win32') {
    if (! legacy) {
      var stats = fs.statSync(src);
      if (stats.size > 290000000 || // 600 MB and larger apps require chunking, but Debris at 276.5 MB to use adm-zip
          stats.size == 11247281 || // special-case GecoMIDI 1.0.9 where otherwise adm-zip corrupts Leapd.dll
          stats.size == 63477600    // special-case JungleJumper 1.0.11HP.zip avoid crash in adm-zip
          ) {
        try {
          console.log('Looking for unzip (chunked) package');
          var NodeUnzip = require('unzip');
          console.log('Found unzip package');
          fs.createReadStream(src).pipe(NodeUnzip.Extract({ path: dest }))
          .on('close', function() {
            console.log('Extracted ' + src + ' to ' + dest + ' using unzip (chunked) package');
            cb && cb(null);
          })
          .on('error', function(err) {
            console.error('Late error running unzip (chunked), download may loop: ' + err);
            cb && cb(err);
          });
          return;
        } catch(err) {
          console.error('Caught error: ' + err);
          console.error('Error attempting to use unzip module, now trying adm-zip');
        }
      }

      try {
        console.log('Looking for adm-zip package');
        var AdmZip = require('adm-zip');
        console.log('Found adm-zip package');
        var zip = new AdmZip(src);

        var zipEntries = zip.getEntries(); // an array of ZipEntry records
        zipEntries.forEach(function(zipEntry) {
            console.log(zipEntry.toString()); // outputs zip entries information
        });

        zip.extractAllTo(dest, true);
        console.log('Extracted ' + src + ' to ' + dest + ' using the adm-zip package');
        cb && cb(null);
        return;
      } catch(err) {
        console.error('Caught error: ' + err);
        console.error('Error attempting to use adm-zip package, now trying command-line');
      }
    }

    var command = shell.escape(path.join(__dirname, '..', '..', 'bin', 'unzip.exe')) + ' -o ' + shell.escape(src) + ' -d ' + shell.escape(dest);
    console.log('\n\nUsing shell to unzip: ' + command);
    exec(command, { maxBuffer: 1024 * 1024 }, cb); 
  } else if (os.platform() === 'darwin') {
    var command = 'unzip -o ' + shell.escape(src) + ' -d ' + shell.escape(dest);
    console.log('\n\nUsing shell to unzip: ' + command);
    exec(command, { maxBuffer: MaxChildProcessBufferSize }, cb);
  } else {
    cb && cb(new Error("Don't know how to unzip on platform: " + os.platform()));
  }
}

function extractAppZip(src, dest, cb, legacy) {
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
  }, legacy);
}

function extractAppDmg(src, dest, cb) {
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

module.exports.unzip = unzip;
module.exports.unzipApp = extractAppZip;
module.exports.undmgApp = extractAppDmg;


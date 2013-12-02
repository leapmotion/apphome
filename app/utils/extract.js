var AdmZip = require('adm-zip');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var os = require('os');
var mv = require('mv');
var path = require('path');
var plist = require('plist');
var unzip = require('unzip');

var shell = require('./shell.js');

var IgnoredWindowsFileRegex = /^\.|^__macosx$/i;
var MaxChildProcessBufferSize = 1024 * 1024 * 5; // 5 MB

function unzipViaNodeUnzip(src, dest, cb) {
  var inputStream = fs.createReadStream(src);
  var outputStream = unzip.Extract({ path: dest });

  inputStream.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
  outputStream.on('close', function() {
    cb && cb(null);
    cb = null;
  });
  outputStream.on('error', function(err) {
    cb && cb(err);
    cb = null;
  });
  console.log('Unzipping '+ src + ' to ' + dest + ' with node-unzip.');
  inputStream.pipe(outputStream);
}

function unzipViaAdmZip(src, dest, cb) {
  try {
    var zip = new AdmZip(src);
    console.log('Unzipping ' + src + ' to ' + dest + ' with AdmZip.');
    zip.extractAllTo(dest, true);
    cb && cb(null);
  } catch(err) {
    cb && cb(err);
  }
}

function unzipViaShell(src, dest, cb) {
  var command;
  if (os.platform() === 'win32') {
    command = shell.escape(path.join(__dirname, '..', '..', 'bin', 'unzip.exe')) + ' -o ' + shell.escape(src) + ' -d ' + shell.escape(dest);
  } else {
    command = 'unzip -o ' + shell.escape(src) + ' -d ' + shell.escape(dest);
  }
  console.log('Unzipping with command: ' + command);
  exec(command, { maxBuffer: MaxChildProcessBufferSize }, cb);
}

function unzipFile(src, dest, shellUnzipOnly, cb) {
  console.log('Unzipping ' + src);
  unzipViaShell(src, dest, function(err) {
    if (err && !shellUnzipOnly) {
      var stats = fs.statSync(src);
      if (os.platform() === 'win32' &&
          (stats.size > 290000000 || // 600 MB and larger apps require chunking, but Debris at 276.5 MB to use adm-zip
           stats.size == 11247281 || // special-case GecoMIDI 1.0.9 where otherwise adm-zip corrupts Leapd.dll
           path.basename(dest).match(/JungleJumper/))) { // special-case JungleJumper 1.0.xHP.zip avoid crash in adm-zip
        unzipViaNodeUnzip(src, dest, cb);
      } else {
        unzipViaAdmZip(src, dest, cb);
      }
    } else {
      cb && cb(err);
    }
  });
}

function extractAppZip(src, dest, shellUnzipOnly, cb) {
  if (!fs.existsSync(src)) {
    return cb && cb(new Error('Zip archive does not exist: ' + src));
  }
  try {
    if (fs.existsSync(dest)) {
      fs.removeSync(dest);
    }
    fs.mkdirpSync(dest);
  } catch (err) {
    console.warn('Error deleting directory "' + dest + '": ' + (err.stack || err));
    return cb && cb(err);
  }

  unzipFile(src, dest, shellUnzipOnly, function(err) {
    function chmodRecursiveSync(file) {
      fs.chmodSync(file, 0777); // make sure file has write permissions
      if (fs.statSync(file).isDirectory()) {
        fs.readdirSync(file).forEach(function(subFile) {
          chmodRecursiveSync(path.join(file, subFile));
        });
      }
    }

    console.log("unzipping " + src);
    if (err) {
      return cb && cb(err);
    }
    if (os.platform() === 'win32') {
      try {
        var extractedFiles = fs.readdirSync(dest);
        var possibleAppDirs = [];
        extractedFiles.forEach(function (extractedFile) {
          if (!IgnoredWindowsFileRegex.test(extractedFile)) {
            possibleAppDirs.push(extractedFile);
          }
        });
        console.log("found possible app dirs: " + JSON.stringify(possibleAppDirs));
        if (possibleAppDirs.length === 1 && fs.statSync(path.join(dest, possibleAppDirs[0])).isDirectory()) {
          // application has a single top-level directory, so pull the contents out of that
          var topLevelDir = path.join(dest, possibleAppDirs[0]);
          console.log("Moving " + topLevelDir + ' to ' + dest);
          chmodRecursiveSync(topLevelDir);

          var moves = [];
          fs.readdirSync(topLevelDir).forEach(function(appFile) {
            moves.push(function(cb) {
              mv(path.join(topLevelDir, appFile), path.join(dest, appFile), {mkdirp: true}, cb);
            });
          });
          async.series(moves, cb);
        } else {
          cb && cb(null);
        }
      } catch (err) {
        cb && cb(err);
      }
    } else {
      cb && cb(null);
    }
  });
}

function extractAppDmg(src, dest, cb) {
  if (!fs.existsSync(src)) {
    return cb && cb(new Error('Disk image does not exist: ' + src));
  }

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
      console.log('Unmounting and ejecting dmg at ' + mountPoint);
      exec('diskutil eject ' + shell.escape(mountPoint), callback);
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
          fs.removeSync(dest);
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
          exec('xattr -rd com.apple.quarantine ' + shell.escape(dest), function(err3) {
            if (err3) {
              console.warn('xattr exec error, ignoring: ' + err3);
            }
            unmount(cb);
          });
        }
      });
    }
  });
}

module.exports.unzip = unzipFile;
module.exports.unzipApp = extractAppZip;
module.exports.undmgApp = extractAppDmg;


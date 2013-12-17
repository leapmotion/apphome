// Generated by CoffeeScript 1.6.3
(function() {
  var AdmZip, IgnoredWindowsFileRegex, MaxChildProcessBufferSize, async, chmodRecursiveSync, exec, extractAppDmg, extractAppZip, fs, mv, os, path, plist, shell, unzip, unzipFile, unzipViaAdmZip, unzipViaNodeUnzip, unzipViaShell;

  AdmZip = require("adm-zip");

  async = require("async");

  exec = require("child_process").exec;

  fs = require("fs-extra");

  os = require("os");

  mv = require("mv");

  path = require("path");

  plist = require("plist");

  unzip = require("unzip");

  shell = require("./shell.js");

  IgnoredWindowsFileRegex = /^\.|^__macosx$/i;

  MaxChildProcessBufferSize = 1024 * 1024 * 5;

  unzipViaNodeUnzip = function(src, dest, cb) {
    var inputStream, outputStream;
    inputStream = fs.createReadStream(src);
    outputStream = unzip.Extract({
      path: dest
    });
    inputStream.on("error", function(err) {
      if (typeof cb === "function") {
        cb(err);
      }
      return cb = null;
    });
    outputStream.on("close", function() {
      if (typeof cb === "function") {
        cb(null);
      }
      return cb = null;
    });
    outputStream.on("error", function(err) {
      if (typeof cb === "function") {
        cb(err);
      }
      return cb = null;
    });
    console.log("Unzipping " + src + " to " + dest + " with node-unzip.");
    return inputStream.pipe(outputStream);
  };

  unzipViaAdmZip = function(src, dest, cb) {
    var err, zip;
    try {
      zip = new AdmZip(src);
      console.log("Unzipping " + src + " to " + dest + " with AdmZip.");
      zip.extractAllTo(dest, true);
      return typeof cb === "function" ? cb(null) : void 0;
    } catch (_error) {
      err = _error;
      return typeof cb === "function" ? cb(err) : void 0;
    }
  };

  unzipViaShell = function(src, dest, cb) {
    var command;
    command = void 0;
    if (os.platform() === "win32") {
      command = shell.escape(path.join(__dirname, "..", "..", "bin", "unzip.exe")) + " -o " + shell.escape(src) + " -d " + shell.escape(dest);
    } else {
      command = "unzip -o " + shell.escape(src) + " -d " + shell.escape(dest);
    }
    console.log("Unzipping with command: " + command);
    return exec(command, {
      maxBuffer: MaxChildProcessBufferSize
    }, cb);
  };

  unzipFile = function(src, dest, shellUnzipOnly, cb) {
    console.log("Unzipping " + src);
    return unzipViaShell(src, dest, function(err) {
      var stats;
      if (err && !shellUnzipOnly) {
        stats = fs.statSync(src);
        if (os.platform() === "win32" && (stats.size > 290000000 || stats.size === 11247281 || path.basename(dest).match(/JungleJumper/))) {
          return unzipViaNodeUnzip(src, dest, cb);
        } else {
          return unzipViaAdmZip(src, dest, cb);
        }
      } else {
        return typeof cb === "function" ? cb(err) : void 0;
      }
    });
  };

  chmodRecursiveSync = function(file) {
    fs.chmodSync(file, 777);
    if (fs.statSync(file).isDirectory()) {
      return fs.readdirSync(file).forEach(function(subFile) {
        return chmodRecursiveSync(path.join(file, subFile));
      });
    }
  };

  extractAppZip = function(src, dest, shellUnzipOnly, cb) {
    var err;
    if (!fs.existsSync(src)) {
      return typeof cb === "function" ? cb(new Error("Zip archive does not exist: " + src)) : void 0;
    }
    try {
      if (fs.existsSync(dest)) {
        fs.removeSync(dest);
      }
      fs.mkdirpSync(dest);
    } catch (_error) {
      err = _error;
      console.warn("Error deleting directory \"" + dest + "\": " + (err.stack || err));
      return typeof cb === "function" ? cb(err) : void 0;
    }
    return unzipFile(src, dest, shellUnzipOnly, function(err) {
      var extractedFiles, moves, possibleAppDirs, topLevelDir;
      console.log("unzipping " + src);
      if (err) {
        return typeof cb === "function" ? cb(err) : void 0;
      }
      if (os.platform() === "win32") {
        try {
          extractedFiles = fs.readdirSync(dest);
          possibleAppDirs = [];
          extractedFiles.forEach(function(extractedFile) {
            if (!IgnoredWindowsFileRegex.test(extractedFile)) {
              return possibleAppDirs.push(extractedFile);
            }
          });
          console.log("found possible app dirs: " + JSON.stringify(possibleAppDirs));
          if (possibleAppDirs.length === 1 && fs.statSync(path.join(dest, possibleAppDirs[0])).isDirectory()) {
            topLevelDir = path.join(dest, possibleAppDirs[0]);
            console.log("Moving " + topLevelDir + " to " + dest);
            chmodRecursiveSync(topLevelDir);
            moves = [];
            fs.readdirSync(topLevelDir).forEach(function(appFile) {
              return moves.push(function(cb) {
                return mv(path.join(topLevelDir, appFile), path.join(dest, appFile), {
                  mkdirp: true
                }, cb);
              });
            });
            return async.series(moves, cb);
          } else {
            return typeof cb === "function" ? cb(null) : void 0;
          }
        } catch (_error) {
          err = _error;
          return typeof cb === "function" ? cb(err) : void 0;
        }
      } else {
        return typeof cb === "function" ? cb(null) : void 0;
      }
    });
  };

  extractAppDmg = function(src, dest, cb) {
    if (!fs.existsSync(src)) {
      return typeof cb === "function" ? cb(new Error("Disk image does not exist: " + src)) : void 0;
    }
    if (os.platform() !== "darwin") {
      return typeof cb === "function" ? cb(new Error("Extracting DMG is only supported on Mac OS X.")) : void 0;
    }
    return exec("hdiutil mount -nobrowse " + shell.escape(src) + " -plist", function(err, stdout) {
      var appPackage, dirEntries, dirEntry, dirErr, entry, err2, isValidDir, mkdirErr, mountPoint, parsedOutput, readErr, systemEntities, systemEntity, unmount, _i, _j, _len, _len1;
      unmount = function(callback) {
        console.log("Unmounting and ejecting dmg at " + mountPoint);
        return exec("diskutil eject " + shell.escape(mountPoint), callback);
      };
      if (err) {
        return typeof cb === "function" ? cb(err) : void 0;
      }
      mountPoint = void 0;
      try {
        parsedOutput = plist.parseStringSync(stdout.toString());
        systemEntities = parsedOutput["system-entities"];
        for (_i = 0, _len = systemEntities.length; _i < _len; _i++) {
          systemEntity = systemEntities[_i];
          if (systemEntity["mount-point"]) {
            mountPoint = systemEntity["mount-point"];
            break;
          }
        }
      } catch (_error) {
        err2 = _error;
        return typeof cb === "function" ? cb(err2) : void 0;
      }
      if (!mountPoint) {
        return typeof cb === "function" ? cb(new Error("Mounting disk image failed.")) : void 0;
      }
      try {
        dirEntries = fs.readdirSync(mountPoint);
      } catch (_error) {
        readErr = _error;
        console.error("Failed to read mount point");
        return typeof cb === "function" ? cb(readErr) : void 0;
      }
      appPackage = void 0;
      for (_j = 0, _len1 = dirEntries.length; _j < _len1; _j++) {
        entry = dirEntries[_j];
        dirEntry = path.join(mountPoint, entry);
        try {
          isValidDir = /\.app$/i.test(dirEntry) && fs.statSync(dirEntry).isDirectory();
        } catch (_error) {
          dirErr = _error;
          isValidDir = false;
        }
        if (isValidDir) {
          if (appPackage) {
            unmount(function() {
              return typeof cb === "function" ? cb(new Error("Multiple .app directories encountered in DMG: " + appPackage + ", " + dirEntry)) : void 0;
            });
          } else {
            appPackage = dirEntry;
          }
        }
      }
      if (!appPackage) {
        return unmount(function() {
          return cb(new Error("No .app directory found in DMG."));
        });
      } else {
        try {
          if (fs.existsSync(dest)) {
            chmodRecursiveSync(dest);
            fs.removeSync(dest);
          }
        } catch (_error) {
          err2 = _error;
          return unmount(function() {
            return typeof cb === "function" ? cb(err2) : void 0;
          });
        }
        try {
          fs.mkdirpSync(path.dirname(dest));
        } catch (_error) {
          mkdirErr = _error;
          return typeof cb === "function" ? cb(mkdirErr) : void 0;
        }
        console.log("Installing app from " + appPackage + " to " + dest);
        return exec("cp -r " + shell.escape(appPackage) + " " + shell.escape(dest), function(err) {
          if (err) {
            return unmount(function(err2) {
              return typeof cb === "function" ? cb(err || err2 || null) : void 0;
            });
          } else {
            return exec("xattr -rd com.apple.quarantine " + shell.escape(dest), function(err3) {
              if (err3) {
                console.warn("xattr exec error, ignoring: " + err3);
              }
              return unmount(cb);
            });
          }
        });
      }
    });
  };

  module.exports.unzip = unzipFile;

  module.exports.unzipApp = extractAppZip;

  module.exports.undmgApp = extractAppDmg;

  module.exports.chmodRecursiveSync = chmodRecursiveSync;

}).call(this);

/*
//@ sourceMappingURL=extract.map
*/

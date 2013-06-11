var fs = require('fs');
var os = require('os');
var path = require('path');

var config = require('../../config/config.js');

var appDataDir;
var appDataSubDirs = {};

function getDir(subdir) {
  if (!appDataDir) {
    if (!config.PlatformDirs[os.platform()]) {
      throw new Error('Unknown operating system: ' + os.platform());
    }

    appDataDir = path.join((config.PlatformDirs[os.platform()] || ''), uiGlobals.appName, 'AppData');

    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir);
    }
  }

  if (subdir && !appDataSubDirs[subdir]) {
    appDataSubDirs[subdir] = path.join(appDataDir, subdir);
    if (!fs.existsSync(appDataSubDirs[subdir])) {
      fs.mkdirSync(appDataSubDirs[subdir]);
    }
  }

  return subdir ? appDataSubDirs[subdir] : appDataDir;
}

function pathForFile(subdir, filename) {
  return path.join(getDir(subdir), filename);
}

function readFile(subdir, filename) {
  return fs.readFileSync(pathForFile(subdir, filename));
}

function writeFile(subdir, filename, data) {
  return fs.writeFileSync(pathForFile(subdir, filename), data);
}

module.exports.getDir = getDir;
module.exports.pathForFile = pathForFile;
module.exports.readFile = readFile;
module.exports.writeFile = writeFile;

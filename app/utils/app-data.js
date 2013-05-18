var fs = require('fs');
var os = require('os');
var path = require('path');

var PlatformDirs = {
  win32:  [ process.env.LOCALAPPDATA || process.env.APPDATA ],
  darwin: [ process.env.HOME, 'Library', 'Application Support' ],
  linux:  [ process.env.HOME, '.config' ]
};


var appDataDir;
var appDataSubDirs = {};

function getDir(subdir) {
  if (!appDataDir) {
    if (!PlatformDirs[os.platform()]) {
      throw new Error('Unknown operating system: ' + os.platform());
    }

    var appName = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'))).name;
    appDataDir = path.join.apply(path, PlatformDirs[os.platform()].concat([ appName, 'AppData' ]));

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

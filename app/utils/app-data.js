var fs = require('fs');
var os = require('os');
var path = require('path');

var PlatformDirs = {
  win32:  process.env.LOCALAPPDATA || process.env.APPDATA,
  darwin: path.join(process.env.HOME, 'Library', 'Application Support'),
  linux: path.join(process.env.HOME, '.config')
};


var appDataDir;

function getDir() {
  if (!appDataDir) {
    if (!PlatformDirs[os.platform()]) {
      throw new Error('Unknown operating system: ' + os.platform());
    }

    var appName = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'))).name;
    appDataDir = path.join(PlatformDirs[os.platform()], appName, 'AppData');

    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir);
    }
  }

  return appDataDir;
}

function pathForFile(filename) {
  return path.join(getDir(), filename);
}

function readFile(filename) {
  return fs.readFileSync(pathForFile(filename));
}

function writeFile(filename, data) {
  return fs.writeFileSync(pathForFile(filename), data);
}

module.exports.getDir = getDir;
module.exports.pathForFile = pathForFile;
module.exports.readFile = readFile;
module.exports.writeFile = writeFile;

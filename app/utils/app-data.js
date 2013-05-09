var fs = require('fs');
var os = require('os');
var path = require('path');

var platformDirs = {
  win32:  process.env.APPDATA + '\\',
  darwin: '~/Library/Application Support/',
  linux:  '~/.'
};

var appName = 'nw';

function setAppName(newAppName) {
  appName = newAppName;
}

function getDir() {
  var dir = platformDirs[os.platform()] + appName;
  if (!dir) {
    throw new Error('unknown system platform: ' + os.platform());
  }

  fs.mkdirSync(dir);

  return dir;
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

exports.setAppName = setAppName;
exports.getDir = getDir;
exports.pathForFile = pathForFile;
exports.readFile = readFile;
exports.writeFile = writeFile;

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var plist = require('plist');

var shell = require('./shell.js');

function parseFile(plistPath, cb) {
  function parseResult(err, result) {
    if (err) {
      return cb && cb(err);
    }
    try {
      return cb && cb(null, parse(result.toString()));
    } catch (err2) {
      return cb && cb(err2);
    }
  }
  if (os.platform() === 'darwin') {
    exec('plutil -convert xml1 -o - ' + shell.escape(plistPath), parseResult);
  } else {
    fs.readFile(plistPath, parseResult);
  }
}

function parse(rawPlist) {
  return plist.parseStringSync(rawPlist);
}

module.exports.parseFile = parseFile;
module.exports.parse = parse;


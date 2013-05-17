var os = require('os');
var exec = require('child_process').exec;
var path = require('path');

var shell = require('./shell.js');

function convertToPng(inputBinary, outputPng, cb) {
  var size = 96;

  if (os.platform() !== 'win32') {
    return cb(new Error('ico conversion is only supported on Windows'));
  }

  exec(path.join(__dirname, '..', '..', 'bin', 'IconExtractor.exe') + ' ' +
       shell.escape(inputBinary) + ' ' + shell.escape(outputPng) + ' ' + size, cb);

}

module.exports.convertToPng = convertToPng;

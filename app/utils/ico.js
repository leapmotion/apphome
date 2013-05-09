var os = require('os');
var exec = require('child_process').exec;
var shell = require('./shell.js');

function convertToPng(inputBinary, outputPng, cb) {
  if (os.platform() !== 'win32') {
    throw new Error('ico conversion is only supported on Windows');
  }

  cb('not yet implemented'); // TODO
}
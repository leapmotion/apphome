var os = require('os');
var exec = require('child_process').exec;
var shell = require('./shell.js');

function convertToPng(inputIcns, outputPng, cb) {
  if (os.platform() !== 'darwin') {
    throw new Error('icns conversion is only supported on OS X');
  }

  exec('sips -s format png ' + shell.escape(inputIcns) + ' --out ' + shell.escape(outputPng), cb);
}

exports.convertToPng = convertToPng;

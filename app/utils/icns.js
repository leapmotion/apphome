var os = require('os');
var exec = require('child_process').exec;
var shell = require('./shell.js');

function convertToPng(inputIcns, outputPng, cb) {
  var size = 96; // TODO: double on retina displays
                 // (determine retina display by parsing resolution output of "system_profiler SPDisplaysDataType")

  if (os.platform() !== 'darwin') {
    return cb(Error('icns conversion is only supported on OS X'));
  }

  exec('sips -s format png -z ' + size + ' ' + size + ' ' +
       shell.escape(inputIcns) + ' --out ' + shell.escape(outputPng), cb);
}

module.exports.convertToPng = convertToPng;

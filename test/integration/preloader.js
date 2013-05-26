var fs = require('fs');
var path = require('path');
var domInjection = require('../../app/utils/dom-injection.js');
var Mocha = require('mocha');
var assert = require('assert');
var socketReporter = require('./socket-reporter.js');

global.leapEnv = 'test';
global.assert = assert;

var scripts = [
  './node_modules/mocha/mocha.js'
];
scripts = scripts.concat(sources(path.resolve(__dirname, './js_support')));
scripts = _(scripts).compact();

var stylesheets = [
  './node_modules/mocha/mocha.css'
];

$(window).load(function() {
  console.info('\n\nInjecting Mocha and Test Scripts:\n' + scripts.join('\n'));

  $('body').append('<div id="mocha"/>');
  window.$('body').append(scripts.map(function(src) {
    return '<script src="' + src + '"></script>';
  }).join('\n'));

  stylesheets.forEach(function(src) {
    domInjection.appendScriptTag(src);
  });

  var mocha = new Mocha();
  mocha.addFile(process.env.LEAPHOME_INTEGRATION_TEST_PATH);
  mocha.reporter(socketReporter).run();
});

function isJs(path) {
  return path.substr(-3) === '.js';
}

function sources(dir) {
  return fs.readdirSync(path.resolve(dir)).map(function(relPath) {
    return isJs(relPath) && ('./' + path.relative(global.LeapHomeDir, path.resolve(dir, relPath)));
  })
}

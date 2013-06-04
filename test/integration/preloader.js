var fs = require('fs');
var path = require('path');
var domInjection = require('../../app/utils/dom-injection.js');
var Mocha = require('mocha');
var assert = require('assert');
var socketReporter = require('./socket-reporter.js');
var AppController = require('../../app/app-controller.js');
var db = require('../../app/utils/db.js');

global.leapEnv = 'test';
global.assert = assert;

var scripts = _.compact(sources(path.resolve(__dirname, './js_support')));

var stylesheets = [
  './node_modules/mocha/mocha.css'
];


AppController.prototype.restoreWindowSize = function() {
  console.log('Stubbing window maximize'); // actual resize fails in tests for some reason, so stubbing it. // todo: determiner root problem
};
db.setDbName('test');

$(window).load(function() {
  console.info('\n\nInjecting Mocha and Test Scripts:\n' + scripts.join('\n'));

  $('body').append('<div id="mocha"/>');
  scripts.forEach(function(src) {
    $('<script src="' + src + '"></script>').appendTo('body');
  });

  stylesheets.forEach(function(src) {
    domInjection.appendStylesheet(src);
  });

  var mocha = new Mocha();
  mocha.addFile(process.env.LEAPHOME_INTEGRATION_TEST_PATH);
  mocha.reporter(socketReporter).run();
});

function sources(dir) {
  var jsSources = [];
  fs.readdirSync(dir).forEach(function(relPath) {
    if (path.extname(relPath) === 'js') {
      jsSources.push('./' + path.relative(global.LeapHomeDir, path.resolve(dir, relPath)));
    }
  });
  return jsSources;
}

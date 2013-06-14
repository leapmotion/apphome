var fs = require('fs');
var path = require('path');
var domInjection = require('../../app/utils/dom-injection.js');
var Mocha = require('mocha');
var assert = require('assert');
var SocketReporter = require('./socket-reporter.js');
var db = require('../../app/utils/db.js');

global.leapEnv = 'test';
global.assert = assert;

var scripts = _.compact(sources(path.join(__dirname, 'js_support')));

var stylesheets = [
  'file://' + path.join(__dirname, '..', '..', 'node_modules', 'mocha', 'mocha.css')
];

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
  mocha.reporter(SocketReporter).run();
});

function sources(dir) {
  var jsSources = [];
  fs.readdirSync(dir).forEach(function(file) {
    if (path.extname(file) === '.js') {
      jsSources.push('file://' + path.join(dir, file));
    }
  });
  return jsSources;
}

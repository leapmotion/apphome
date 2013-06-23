var fs = require('fs');
var path = require('path');
var Mocha = require('mocha');
var assert = require('assert');
var SocketReporter = require('./socket-reporter.js');
var db = require('../../app/utils/db.js');

global.leapEnv = 'test';
global.assert = assert;

var scripts = _.compact(sources(path.join(__dirname, 'js_support')));

window.localStorage.clear();

setInterval(function() {
  var authIframeWindow = $('.authorization iframe').prop('contentWindow');
  if (authIframeWindow) {
    $('input[name=username]', authIframeWindow.document).val('blah');
    $('input[name=password]', authIframeWindow.document).val('blah');
    $('form#new_user', authIframeWindow.document).submit();
  }
}, 100);

$(window).load(function() {
  console.info('\n\nInjecting Mocha and Test Scripts:\n' + scripts.join('\n'));

  scripts.forEach(function(src) {
    $('<script src="' + src + '"></script>').appendTo('body');
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

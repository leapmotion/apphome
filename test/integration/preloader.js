var fs = require('fs');
var path = require('path');
var Mocha = require('mocha');
var assert = require('assert');

var SocketReporter = require('./socket-reporter.js');
var config = require('../../config/config.js');
var db = require('../../app/utils/db.js');

global.leapEnv = 'test';
global.assert = assert;
var scripts = _.compact(sources(path.join(__dirname, 'js_support')));
var bootstrapController = require('../../app/bootstrap-controller.js');

// tmp - todo: move to auth tests
//setInterval(function() {
//  var authIframeWindow = $('.authorization iframe').prop('contentWindow');
//  if (authIframeWindow) {
//    $('input[name=username]', authIframeWindow.document).val('blah');
//    $('input[name=password]', authIframeWindow.document).val('blah');
//    $('form#new_user', authIframeWindow.document).submit();
//  }
//}, 100);

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

function initTestState(opts) {
  opts = opts || {};
  window.localStorage.clear();
  db.setItem(config.DbKeys.AlreadyDidFirstRun, opts.alreadyDidFirstRun);
  db.setItem(config.DbKeys.HasEmbeddedLeapDevice, opts.hasEmbeddedLeapDevice);
//  if (opts.loginAs) {
//    var AuthTasks = bootstrapController.__get__('AuthTasks');
//    AuthTasks.getAccessToken = function() { return 'abcdef0123456789'; };
//    // todo: complete
//  }
  if (_.isFunction(opts.preInit)) {
    opts.preInit();
  }
}

function runTestApp() {
  initTestState(global.testOptions);
  bootstrapController.run();
}


exports.run = runTestApp;

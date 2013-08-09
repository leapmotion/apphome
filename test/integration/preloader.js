var fs = require('fs');
var path = require('path');
var Mocha = require('mocha');
var assert = require('assert');

var SocketReporter = require('./socket-reporter.js');
var config = require('../../config/config.js');
var wraprequire = require('../../app/utils/wraprequire.js');

global.leapEnv = 'test';
global.assert = assert;
var scripts = _.compact(sources(path.join(__dirname, 'js_support')));

$(window).load(function() {
  console.info('\n\nInjecting Mocha and Test Scripts:\n' + scripts.join('\n'));

  scripts.forEach(function(src) {
    $('<script src="' + src + '"></script>').appendTo('body');
  });

  // This is _really_ @#$@#$& brittle - do not reorder this!
  var mocha = new Mocha();
  mocha.addFile(process.env.LEAPHOME_INTEGRATION_TEST_PATH);
  mocha.reporter(SocketReporter).run();
  initTestState(global.testOptions);
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
  if (_.isFunction(opts.preInit)) {
    opts.preInit();
  }
  if (opts.isLeapEnabled) {
    wraprequire.override('../../app/utils/leap.js', '../support/leap/connected.js', module);
  }
  var db = require('../../app/utils/db.js');
  db.setItem(config.DbKeys.AlreadyDidFirstRun, opts.alreadyDidFirstRun);
  db.setItem(config.DbKeys.HasEmbeddedLeapDevice, opts.hasEmbeddedLeapDevice);
  db.setItem(config.DbKeys.PrebundlingComplete, opts.prebundlingComplete);
}

function runTestApp() {
  setTimeout(function() {
    var bootstrapController = require('../../app/bootstrap-controller.js');
    bootstrapController.run();
  });
}


exports.run = runTestApp;

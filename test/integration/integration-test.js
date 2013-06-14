var fs = require('fs');
var path = require('path');
var fork = require('child_process').fork;
var async = require('async');
var net = require('net');
var Mocha = require('mocha');
global._ = global._ || require('underscore');
global.assert = require('assert');

var ReportServerPort = 22001; // TODO: move to config file (used in socket-reporter.js)
var IntegrationTestLoaderPath = path.resolve(__dirname, './preloader');
global.LeapHomeDir = global.LeapHomeDir || path.join(__dirname, '..', '..');
var MaxTestTime = 1000 * 2000;

global.isRunningTest = function() {
  return !!process.env.LEAPHOME_INTEGRATION_TEST_PATH;
};

function runInApp(fileName, testFn) {
  var testPath = process.env.LEAPHOME_INTEGRATION_TEST_PATH;

  if (!testPath) {
    setupLeapHomeTestApp(fileName, testFn);
  } else {
    console.info('Running integration test: ' + fileName);
    describe('integration test for ' + fileName, function() {
      this.timeout(MaxTestTime);
      it('should run actual tests', function(done) {
        testFn();
        done(null);
      });
    });
  }
}

function setupLeapHomeTestApp(fileName) {
  console.info('Starting app to run integration test: ' + fileName);
  var reportServer;
  var allDone, isComplete;

  describe('Node-webkit process for ' + fileName, function() {
    this.timeout(MaxTestTime);
    var testContext = this;

    function reportTestResult(testResult) {
      describe(fileName, function() {
        it(testResult.fullTitle, function() {
          if (testResult.result === 'pass') {
            assert.ok(true); // needed?
          } else if (testResult.error) {
            var ex = new Error(testResult.error.message);
            ex.stack = testResult.error.stack;
            console.log(testResult.error.message + ex.stack);
            throw ex;
          } else {
            throw new Error('unknown error');
          }
        });
      });
    }

    function reportSyntaxError(msg) {
      describe(fileName + ' reporting failure', function() {
        it('should run mocha test without catastrophic failure', function() {
          assert.ok(false, msg);
        });
      });
    }

    function tearDown() {
      if (!isComplete) {
        isComplete = true;
        console.log('Integration test completed: ' + fileName);
        if (reportServer) {
          reportServer.close(function () {
            allDone();
          });
        } else {
          allDone();
        }
      }
    }

    it('should start app and run tests', function(done) {
      allDone = done;
      reportServer = net.createServer(function(conn) {
        conn.on('error', function(err) {
          // swallow connection errors, because they pop up randomly on Windows
        });
        conn.on('data', function(data) {
          try {
            reportTestResult.call(testContext, JSON.parse(data.toString('utf8')));
          } catch (err) {
            console.error('Invalid test report: ' + data);
            reportSyntaxError('Failed to parse test result: ' + err.message);
            tearDown();
          }
        });
      });

      reportServer.listen(ReportServerPort, '127.0.0.1', function() {
        try {
          runApp(fileName, tearDown);
        } catch (err) {
          console.error(err);
          tearDown();
        }
      });

      reportServer.on('error', function(err) {
        console.log(err.stack || err);
      });
    });
  });
}

function runApp(testFile, tearDown) {
  var targetEnv = _.extend({}, process.env, {
    LEAPHOME_PRELOAD_SCRIPT_PATH: IntegrationTestLoaderPath,
    LEAPHOME_INTEGRATION_TEST_PATH: path.resolve(LeapHomeDir, testFile)
  });
  console.info('Starting integration test: ' + testFile);
  var child = fork(path.join(LeapHomeDir, 'bin', 'airspace'), [], {
    cwd: LeapHomeDir,
    env: targetEnv
  });

  child.on('error', function(err) {
    console.error(err.stack || err);
    process.exit(1);
  });

  child.on('exit', function() {
    tearDown();
  });
}

module.exports.runInApp = runInApp;

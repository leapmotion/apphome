var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var async = require('async');
var net = require('net');
var Mocha = require('mocha');
global._ = global._ || require("underscore");
global.assert = require('assert');

var ReportServerPort = 22001; // TODO: move to config file (used in socket-reporter.js)
var IntegrationTestLoaderPath = path.resolve(__dirname, './preloader');
global.LeapHomeDir = global.LeapHomeDir || path.resolve(__dirname, '../..');
var MaxTestTime = 1000 * 5;

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

function setupLeapHomeTestApp(fileName, testFn) {
  console.info('Starting app to run integration test: ' + fileName);
  var reportServer;
  var allDone, isComplete;

  describe('Node-webkit process for ' + fileName, function() {
    this.timeout(MaxTestTime);
    var testContext = this;

    var reportTestResult = function(testResult) {
      describe(fileName, function() {
        it(testResult.fullTitle, function() {
          if (testResult.result === 'pass') {
            assert.ok(true); // needed?
          } else if (testResult.error) {
            var ex = new Error(testResult.error.message);
            ex.stack = testResult.error.stack;
            throw ex;
          } else {
            throw new Error('unknown error');
          }
        });
      });
    };

    var reportSyntaxError = function(msg) {
      describe(fileName + ' reporting failure', function() {
        it('should run mocha test without catastrophic failure', function() {
          assert.ok('false', msg);
        });
      });
    };

    var tearDown = function() {
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
    };

    it("should start app and run tests", function(done) {
      allDone = done;
      reportServer = net.createServer(function(conn) { //'connection' listener
        conn.on('data', function(data) {
          var jsonString = data.toString('utf8');
          try {
            reportTestResult.call(testContext, JSON.parse(jsonString));
          } catch (err) {
            console.error('Invalid test report: ' + data);
            reportSyntaxError('Failed to parse test result: ' + err.message);
            tearDown();
          }
        });
      });

      reportServer.listen(ReportServerPort, function() {
        try {
          runApp(fileName, tearDown);
        } catch (err) {
          console.error(err);
          tearDown();
        }
      });
    });
  });
}


function runApp(testFile, onFinish) {
  var targetEnv = _.extend({}, process.env, {
    LEAPHOME_PRELOAD_SCRIPT_PATH: IntegrationTestLoaderPath,
    LEAPHOME_INTEGRATION_TEST_PATH: path.resolve(LeapHomeDir, testFile) // path.resolve(IntegrationTestDir, testFile)
  });
  console.info("Starting integration test: " + testFile);
  var child = childProcess.spawn('bin/airspace', [], {  // todo: pick script by os
    cwd: LeapHomeDir,
    env: targetEnv
  });

  //  var timer = setTimeout(function() {
  //    console.error(testFile + ' integration test did not finish, aborting.');
  //    // TODO: report timeout (fail a test)
  //    child.kill();
  //    onFinish();
  //  }, MaxTestTime);


  // echo console:
  child.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  child.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });

  child.on('close', function (code) {
    // clearTimeout(timer);
    onFinish();
  });
}


module.exports.runInApp = runInApp;
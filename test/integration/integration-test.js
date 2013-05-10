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

var MaxTestTime = 1000 * 15;


function runInApp(fileName, testFn) {
  var testPath = process.env.LEAPHOME_INTEGRATION_TEST_PATH;

  if (!testPath) {
    setupLeapHomeTestApp(fileName, testFn);
  } else {
    console.info('Running integration test: ' + fileName);
    describe('integration test for ' + fileName, function() {
      it('should run actual tests', function(done) {
        testFn();
        done(null);
      });
    });
  }
}

function setupLeapHomeTestApp(fileName, testFn) {
  console.info('Starting leaphome to run integration test: ' + fileName);
  var reportServer;
  describe('start leaphome for ' + fileName, function() {
    it("should start app", function(done) {
      this.timeout(MaxTestTime);
      var testCount = 0;
      reportServer = net.createServer(function(conn) { //'connection' listener
        conn.on('data', function(data) {
          var testResult = JSON.parse(data.toString('utf8'));
          ++testCount;
          describe(fileName + ' test #' + testCount, function() {
            it(testResult.fullTitle, function() {
              assert.ok(testResult.result === 'pass')
            });
          });
        });
      });

      var reportError = function() {
        it(msg, function() {
          assert.ok(false);
        });
      };

      var isComplete;
      var tearDown = function() {
        if (!isComplete) {
          isComplete = true;
          console.log('Integration test completed: ' + fileName);
          if (reportServer) {
            reportServer.close(function () {
              done();
            });
          } else {
            done();
          }
        }
      };

      reportServer.listen(ReportServerPort, function() {
        try {
          runApp(fileName, tearDown);
        } catch (err) {
          console.error(err);
          reportError('should not crash with an error');
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
  var timer = setTimeout(function() {
    console.error(testFile + ' integration test did not finish, aborting.');
    // TODO: report timeout (fail a test)
    child.kill();
    onFinish();
  }, MaxTestTime);


  // echo console:
  child.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  child.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });

  child.on('close', function (code) {
    clearTimeout(timer);
    onFinish();
  });
}


module.exports.runInApp = runInApp;
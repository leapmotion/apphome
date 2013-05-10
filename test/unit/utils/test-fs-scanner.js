require('../env.js');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');

var mockExec = {
  win32: function(command, cb) {
    if (/^reg/.test(command)) {
      if (/Wow6432Node/.test(command)) {
        fs.readFile(path.join(__dirname, 'fs-scanner-data', 'windows-registry-listing-32bit.txt'), cb);
      } else {
        fs.readFile(path.join(__dirname, 'fs-scanner-data', 'windows-registry-listing-64bit.txt'), cb);
      }
    } else {
      throw new Error('unexpected exec command: ' + command);
    }
  },

  darwin: function(command, cb) {
    if (/^find/.test(command)) {
      fs.readFile(path.join(__dirname, 'fs-scanner-data', 'osx-applications-listing.txt'), cb);
    } else if(/^plutil/.test(command)) {
      var commandParts = command.split('/');
      var appName = commandParts[commandParts.length - 3].replace(/\\|\.app$/g, '');
      var rawPlist = fs.readFileSync(path.join(__dirname, 'fs-scanner-data', 'osx-Info.plist'), 'utf-8');
      cb(null, rawPlist.replace(/<string>Microsoft PowerPoint<\/string>/g, '<string>' + appName + '</string>'));
    } else {
      throw new Error('unexpected exec command: ' + command);
    }
  }
};

var mockFs = {
  darwin: {
    mkdirSync: function() {}
  }
};

function mockFsScannerForPlatform(platform, args) {
  var FsScanner = rewire('../../../app/utils/fs-scanner.js');
  if (mockExec[platform]) {
    FsScanner.__set__('exec', mockExec[platform]);
  }
  if (mockFs[platform]) {
    FsScanner.__set__('fs', mockFs[platform]);
  }
  FsScanner.__set__('os', { platform: function() { return platform; }});
  return new FsScanner(args);
}

describe('FsScanner', function() {
  describe('scan on Windows', function() {

    it('should only return the allowed apps', function(done) {
      var fsScanner = mockFsScannerForPlatform('win32', {
        allowedAppNames: [ 'microsoft silverlight', 'quickbooks' ]
      });
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 2, '2 apps matching allowed names');
        done();
      });
    });

    it('should list all apps when no whitelist is specified', function(done) {
      var fsScanner = mockFsScannerForPlatform('win32');
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 55, '55 total apps');
        done();
      });
    });

  });

  describe('scan on Mac', function() {

    it('should only return the allowed apps', function(done) {
      var fsScanner = mockFsScannerForPlatform('darwin', {
        allowedAppNames: [ 'microsoft powerpoint', 'SketchUp' ]
      });
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 2, '2 apps matching allowed names');
        done();
      });
    });

    it('should list all apps when no whitelist is specified', function(done) {
      var fsScanner = mockFsScannerForPlatform('darwin');
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 103, '103 total apps');
        done();
      });
    });

  });
});
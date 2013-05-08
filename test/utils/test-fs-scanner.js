require('../env.js');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');

var mockExec = {
  win32: function(command, cb) {
    if (/Wow6432Node/.test(command)) {
      fs.readFile(path.join(__dirname, 'fs-scanner-data', 'windows-registry-listing-32bit.txt'), cb);
    } else {
      fs.readFile(path.join(__dirname, 'fs-scanner-data', 'windows-registry-listing-64bit.txt'), cb);
    }
  },

  darwin: function(command, cb) {
    fs.readFile(path.join(__dirname, 'fs-scanner-data', 'osx-applications-listing.txt'), cb);
  }
};

var mockFs = {
  darwin: {
    readFileSync: function(filepath, encoding) {
      if (/Info\.plist/.test(filepath)) {
        var pathParts = filepath.split('/');
        var appName = pathParts[pathParts.length - 3].replace(/\.app$/, '');
        filepath = path.join(__dirname, 'fs-scanner-data', 'osx-Info.plist');
        var rawPlist = fs.readFileSync(filepath, 'utf-8');
        return rawPlist.replace(/<string>Microsoft PowerPoint<\/string>/g, '<string>' + appName + '</string>');
      } else {
        return fs.readFileSync(filepath, encoding);
      }
    }
  }
}

function mockFsScannerForPlatform(platform, args) {
  var FsScanner = rewire('../../app/utils/fs-scanner.js');
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
    var fsScanner = mockFsScannerForPlatform('win32', {
      allowedAppNames: [ 'microsoft silverlight', 'quickbooks' ]
    });
    it('should work', function(done) {
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 2, '2 apps matching allowed names');
        done();
      });
    });
  });

  describe('scan on Mac', function() {
    var fsScanner = mockFsScannerForPlatform('darwin', {
      allowedAppNames: [ 'microsoft powerpoint', 'SketchUp' ]
    });
    it('should work', function(done) {
      fsScanner.scan(function(err, apps) {
        assert.ok(!err, err && err.stack);
        assert.equal(apps.length, 2, '2 apps matching allowed names');
        done();
      });
    });
  });
});

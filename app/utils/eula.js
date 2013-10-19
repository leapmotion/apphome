var async = require('async');
var path = require('path');
var os = require('os');
var fs = require('fs-extra');

var config = require('../../config/config.js');

var sharedLeapDir = config.PlatformLeapDataDirs[os.platform()];

var possibleLicenseNames = [/eulahash-.+\.md5/, /license\.version/];

function hasBeenAgreedTo(cb) {
  fs.readdir(path, function(err, files) {
    if (err) {
      cb && cb(err);
    }

    var match = false;
    files.forEach(function(file) {
      possibleLicenseNames.forEach(function(name) {
        match = match || (file.search(name) !== -1);
      });
    });

    cb && cb(null, match);
  });
}

function waitForLicense(cb) {
  var watch = setInterval(function() {
    fs.existsSync(path.join(sharedLeapDir, 'license.version'), function(exists) {
      if (exists) {
        clearInterval(watch);
        cb && cb(null);
      }
    });
  }, 150);
}

module.exports.hasBeenAgreedTo = hasBeenAgreedTo;
module.exports.waitForLicense = waitForLicense;

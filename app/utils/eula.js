var async = require('async');
var path = require('path');
var os = require('os');
var fs = require('fs-extra');

var config = require('../../config/config.js');

var sharedLeapDir = config.PlatformLeapDataDirs[os.platform()];

var possibleLicenseNames = [/eulahash-.+\.md5/, /license\.version/];

function hasBeenAgreedTo(cb) {
  fs.readdir(sharedLeapDir, function(err, files) {
    if (err) {
      cb && cb(err);
    }

    var found = false;
    files.forEach(function(file) {
      possibleLicenseNames.forEach(function(name) {
        found = found || (file.search(name) !== -1);
      });
    });

    cb && cb(null, found);
  });
}

function waitForLicense(cb) {
  console.log('Checking for signed EULA...');
  var watch = setInterval(function() {
    hasBeenAgreedTo(function(err, exists) {
      if (err) {
        console.warn('Error searching for signed EULA: ' + err);
      } else if (exists) {
        console.log('...signed EULA found.');
        clearInterval(watch);
        cb && cb(null);
      }
    });
  }, 150);
}

module.exports.hasBeenAgreedTo = hasBeenAgreedTo;
module.exports.waitForLicense = waitForLicense;

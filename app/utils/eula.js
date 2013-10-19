var async = require('async');
var path = require('path');
var os = require('os');
var fs = require('fs-extra');

var config = require('../../config/config.js');

var sharedLeapDir = config.PlatformLeapDataDirs[os.platform()];

var possibleLicenseNames = [/eulahash-\w\w\.md5/, /license\.version/];

function hasBeenAgreedTo(cb) {
  fs.exists(sharedLeapDir, function(doesExist) {
    if (doesExist) {
      fs.readdir(path, function(err, files) {
        files.forEach(function(file) {
          possibleLicenseNames.forEach(function(name) {
            if (file.search(name) !== -1) {
              return cb && (cb(true));
            }
          });
        });
        return cb && cb(false);
      });
    } else {
      cb && cb(false);
    }
  });
}

function watchForLicense(cb) {
  var watch = setInterval(function() {

  })
}

module.exports.hasBeenAgreedTo = hasBeenAgreedTo;

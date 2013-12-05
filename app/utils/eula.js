// Generated by CoffeeScript 1.6.3
(function() {
  var async, config, fs, hasBeenAgreedTo, os, path, possibleLastauthNames, possibleLicenseNames, sharedLeapDir, waitForLicense;

  async = require("async");

  path = require("path");

  os = require("os");

  fs = require("fs-extra");

  config = require("../../config/config.js");

  sharedLeapDir = config.PlatformLeapDataDirs[os.platform()];

  possibleLicenseNames = [/eulahash-.+\.md5/, /license\.version/];

  possibleLastauthNames = [/lastauth/];

  hasBeenAgreedTo = function(cb) {
    return fs.readdir(sharedLeapDir, function(err, files) {
      var foundLastauth, foundLicense;
      if (err) {
        return cb && cb(false);
      }
      foundLicense = false;
      foundLastauth = false;
      files.forEach(function(file) {
        possibleLicenseNames.forEach(function(name) {
          return foundLicense = foundLicense || (file.search(name) !== -1);
        });
        return possibleLastauthNames.forEach(function(name) {
          return foundLastauth = foundLastauth || (file.search(name) !== -1);
        });
      });
      return cb && cb(foundLicense && foundLastauth);
    });
  };

  waitForLicense = function(cb) {
    var watch;
    console.log("Checking for signed EULA...");
    return watch = setInterval(function() {
      return hasBeenAgreedTo(function(exists) {
        if (exists) {
          console.log("...signed EULA found.");
          clearInterval(watch);
          return cb && cb(null);
        }
      });
    }, 150);
  };

  module.exports.hasBeenAgreedTo = hasBeenAgreedTo;

  module.exports.waitForLicense = waitForLicense;

}).call(this);

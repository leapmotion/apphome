// Generated by CoffeeScript 1.7.1
(function() {
  var Q, async, config, fs, hasBeenAgreedTo, os, path, possibleLastauthNames, possibleLicenseNames, sharedLeapDir, waitForLicense;

  async = require("async");

  path = require("path");

  os = require("os");

  fs = require("q-io/fs");

  Q = require("q");

  config = require("../../config/config.js");

  sharedLeapDir = config.PlatformLeapDataDirs[os.platform()];

  possibleLicenseNames = [/eulahash-.+\.md5/, /license\.version/];

  possibleLastauthNames = [/lastauth/];

  hasBeenAgreedTo = function() {
    return fs.list(sharedLeapDir).then(function(files) {
      var foundLastauth, foundLicense;
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
      return foundLicense && foundLastauth;
    });
  };

  waitForLicense = function() {
    var deferred, watch;
    deferred = Q.defer();
    console.log("Checking for signed EULA...");
    watch = setInterval(function() {
      return hasBeenAgreedTo().then(function(exists) {
        if (exists) {
          console.log("...signed EULA found.");
          clearInterval(watch);
          return deferred.resolve(true);
        }
      }, function(reason) {
        return deferred.reject(reason);
      });
    }, 150);
    return deferred.promise;
  };

  module.exports.hasBeenAgreedTo = hasBeenAgreedTo;

  module.exports.waitForLicense = waitForLicense;

}).call(this);

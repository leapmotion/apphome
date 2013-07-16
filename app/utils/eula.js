var db = require('./db.js');
var path = require('path');
var os = require('os');
var fs = require('fs-extra');
var async = require('async');
var crypto = require('crypto');

var config = require('../../config/config.js');

var BundleEulaAgreementKey = 'bundled_eula_agreement';
var licenseName = 'license-en.html';
var md5Name = 'eulahash.md5';
var sharedLeapDir = path.join.apply(null, [ config.PlatformDirs[os.platform()], 'Leap Motion' ]);
var licenseSourcePath = path.join.apply(null, [ __dirname, '..', '..', 'static', 'popups', licenseName ]);



function needsUpdating(cb) {
  if (db.getItem(BundleEulaAgreementKey)) {
    return cb && cb(null, false);
  }
  var sharedMd5Path = path.join.apply(null, [ sharedLeapDir ].concat([ md5Name]));

  _readOrNull(sharedMd5Path, function(err, sharedHash) {
    if (err) {
      cb && cb(err);
    } else {
      if (!sharedHash) {
        cb && cb(null, true);
      } else {
        _updateEulaAgeementHash(function(err, bundledHash) {
          sharedHash = $.trim(sharedHash);
          cb && cb(null, bundledHash !== sharedHash);
        });
      }
    }
  });
}


function markAsAgreed() {
  var licenseMd5 = db.getItem(BundleEulaAgreementKey);

  var copyLicenseToSharedLocation = function(cb) {
    var targetPath = path.join.apply(null, [ sharedLeapDir ].concat([ licenseName]));
    fs.copy(licenseSourcePath, targetPath, cb);
  };

  var ensureLeapMotionDir = function(cb) {
    fs.exists(sharedLeapDir, function(doesExist) {
      if (!doesExist) {
        fs.mkdirs(sharedLeapDir, cb);
      } else {
        cb && cb(null);
      }
    });
  };

  var writeHashInSharedLocation = function(cb) {
    var targetPath = path.join.apply(null, [ sharedLeapDir ].concat([ md5Name]));
    fs.writeFile(targetPath, db.getItem(BundleEulaAgreementKey), cb);
  };

  async.series([
    _updateEulaAgeementHash,
    ensureLeapMotionDir,
    copyLicenseToSharedLocation,
    writeHashInSharedLocation
  ], function(err) {
    if (err) {
      console.error('Failed to share EULA: ' + (err.stack || err));
    }
  });
}


function _updateEulaAgeementHash(cb) {
  var licenseMd5 = db.getItem(BundleEulaAgreementKey);
  if (licenseMd5) {
    cb && cb(null, licenseMd5);
  } else {
    _readOrNull(licenseSourcePath, function(err, licenseHtml) {
      if (err) {
        return cb && cb(err);
      }
      if (!licenseHtml) {
        cb && cb(new Error('Could not read license at ' + licenseSourcePath));
      } else {
        var md5 = crypto.createHash('md5');
        licenseMd5 = md5.digest('hex').toLowerCase();
        db.setItem(BundleEulaAgreementKey, licenseMd5);
        cb && cb(null, licenseMd5);
      }
    });
  }
}


function _readOrNull(target, cb) {
  fs.exists(target, function(doesExist) {
    if (!doesExist) {
      cb && cb(null, null);
    } else {
      fs.readFile(target, { encoding: 'utf8' }, function(err, data) {
        cb && cb(err, data && data.toString());
      });
    }
  });
}



module.exports.needsUpdating = needsUpdating;
module.exports.markAsAgreed = markAsAgreed;
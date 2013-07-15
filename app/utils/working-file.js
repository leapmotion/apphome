var db = require('./db.js');
var path = require('path');
var os = require('os');
var fs = require('fs-extra');

var config = require('../../config/config.js');

var ActiveTempFilesKey = 'active_temp_files';
var TempFilesNeedingDeletionKey = 'temp_files_needing_deletion';

function newTempFilePath(extension) {
  extension = extension || '';
  if (!config.PlatformTempDirs[os.platform()]) {
    throw new Error('Unknown operating system: ' + os.platform());
  }
  var tempDir = config.PlatformTempDirs[os.platform()];
  var filename = [ 'Airspace', (new Date()).getTime(), Math.random() ].join('_') + '.' + extension.replace(/^\./, '');
  var res = path.join(tempDir, filename);
  _trackFile(res);
  return res;
}

function _workingSet() {
  return db.fetchObj(ActiveTempFilesKey) || {};
}

function _deletionSet() {
  return db.fetchObj(TempFilesNeedingDeletionKey) || {};
}

function _trackFile(filePath) {
  if (!filePath) {
    return;
  }
  var all = _workingSet();
  all[filePath] = true;
  db.saveObj(ActiveTempFilesKey, all);
}

function _markAsDeleted(filePath) {
  if (!filePath) {
    return;
  }
  var all = _deletionSet();
  delete all[filePath];
  db.saveObj(TempFilesNeedingDeletionKey, all);
}

function cleanup() {
  var toDeleteNow = _(_.extend({}, _workingSet(), _deletionSet())).keys();
  db.saveObj(ActiveTempFilesKey, {});

  var sequentialRemove = function() {
    if (!toDeleteNow.length) {
      return;
    }
    var nextFile = toDeleteNow.shift();
    _markAsDeleted(nextFile);

    fs.exists(nextFile, function(doesExist) {
      if (doesExist) {
        fs.remove(nextFile, function(err) {
          if (err) {
            console.error('Unable to delete temp file ' + nextFile + ': ' + (err.stack || err));
          }
          sequentialRemove();
        });
      } else {
        sequentialRemove();
      }
    });
  };

  sequentialRemove();
}


module.exports.newTempFilePath = newTempFilePath;
module.exports.cleanup = cleanup;
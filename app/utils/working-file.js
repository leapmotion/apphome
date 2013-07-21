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

function newTempPlatformArchive() {
  return newTempFilePath(os.platform() === 'darwin' ? 'dmg' : 'zip');
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

function buildCleanupList() {
  uiGlobals.toDeleteNow = _(_.extend({}, _workingSet(), _deletionSet())).keys();
  db.saveObj(ActiveTempFilesKey, {});
}

function cleanup() {
  if (!uiGlobals.toDeleteNow) {
    console.warn('workingFile.buildCleanupList() should have been called before now');
    buildCleanupList();
  }

  var sequentialRemove = function() {
    if (!uiGlobals.toDeleteNow.length) {
      return;
    }
    var nextFile = uiGlobals.toDeleteNow.shift();

    fs.exists(nextFile, function(doesExist) {
      if (doesExist) {
        fs.remove(nextFile, function(err) {
          if (err) {
            console.error('Unable to delete temp file ' + nextFile + ': ' + (err.stack || err));
          }
          _markAsDeleted(nextFile);
          sequentialRemove();
        });
      } else {
        _markAsDeleted(nextFile);
        sequentialRemove();
      }
    });
  };

  sequentialRemove();
}


module.exports.newTempFilePath = newTempFilePath;
module.exports.newTempPlatformArchive = newTempPlatformArchive;
module.exports.buildCleanupList = buildCleanupList;
module.exports.cleanup = cleanup;
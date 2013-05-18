var exec = require('child_process').exec;
var os = require('os');

var BaseModel = require('./base-model.js');
var appData = require('../utils/app-data.js');
var db = require('../utils/db.js');
var appData = require('../utils/app-data.js');
var fs = require('fs');

var LeapAppsDbKey = 'leap_apps';

var BaseLeapAppModel = BaseModel.extend({

  save: function() {
    // note: persisting entire collection for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    var appsToPersist = uiGlobals.leapApps.filter(function(app) {
      return !app.isBuiltinTile();
    });
    var payload = _(appsToPersist).map(function(app) {
      return app.toJSON();
    });
    db.setItem(LeapAppsDbKey, JSON.stringify(payload));
  },

  sortScore: function() {
    throw new Error('sortScore is an abstract method');
  },

  isLocalApp: function() {
    return false;
  },

  isStoreApp: function() {
    return false;
  },

  isBuiltinTile: function() {
    return false;
  },

  hasIcon: function() {
    return !!this.get('hasIcon');
  },

  hasTile: function() {
    return !!this.get('hasTile');
  },

  install: function(cb) {
    throw new Error('install is an abstract method');
  },

  uninstall: function(deleteData, cb) {
    throw new Error('uninstall is an abstract method');
  },

  launch: function() {
    var command = this.launchCommand();
    if (!command) {
      throw new Error("Don't know how to launch apps on: " + os.platform());
    } else {
      console.log('Launching app with command: ' + command);
    }
    var appProcess = exec(command);
    this.set('isLaunched', true);
    appProcess.on('exit', function() {
      this.set('isLaunched', false);
    }.bind(this));
    return appProcess;
  },

  launchCommand: function() {
    throw new Error('launchCommand is an abstract method');
  },

  isInstalled: function() {
    return !!this.get('isInstalled');
  },

  // converts a file name in an appData image subdir into an absolute path and sets that value on the model,
  // triggering change events for the view to bind and display
  setAppDataFileAttrib: function(targetAttribName, srcAttribName, appDataSubdir) {
    if (!this.get(targetAttribName)) {
      var srcName = this.get(srcAttribName);
      if (srcName) {
        var absPath = appData.pathForFile('/' + appDataSubdir + '/' + srcName);
        fs.exists(absPath, function(exists) {
          if (exists) {
            this.set(targetAttribName, absPath);
          }
        }.bind(this));
      }
    }
  }
});

module.exports = BaseLeapAppModel;

module.exports.hydrateCachedModels = function() {
  var cachedApps = JSON.parse(db.getItem(LeapAppsDbKey) || '[]');
  console.log('Cached apps to restore: ' + cachedApps.length);
  cachedApps.forEach(function(appData) {
    try {
      console.log('Restoring cached model ' + appData.id + ': ' + JSON.stringify(appData));
      uiGlobals.leapApps.add(appData);
    } catch (err) {
      console.error('Error restoring leapApp model: ' + err.message);
      console.error('Corrupted leapApp model: ' + JSON.stringify(appData));
      console.dir(err);
    }
  });
};

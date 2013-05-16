var os = require('os');
var spawn = require('child_process').spawn;

var BaseModel = require('./base-model.js');
var appData = require('../utils/app-data.js');
var db = require('../utils/db.js');

var LeapAppsDbKey = 'leap_apps';

var BaseLeapAppModel = BaseModel.extend({

  save: function() {
    // note: persisting entire collection for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    var appsToPersist = uiGlobals.leapApps.filter(function(app) {
      return !app.isBuiltinTile();
    });
    var payload = _(appsToPersist).map(function(app) {
      return app.toJSON(options);
    });
    db.setItem(LeapAppsDbKey, payload);
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

  tileFilename: function() {
    throw new Error('tileFilename is an abstract method');
  },

  iconFilename: function() {
    return appData.pathForFile('icon_' + this.get('id') + '.png');
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
    }
    var appProcess = spawn(command);
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
  }

});

module.exports = BaseLeapAppModel;

module.exports.hydrateCachedModels = function() {
  _(db.getItem(LeapAppsDbKey) || []).invoke(uiGlobals.leapApps.add);
};

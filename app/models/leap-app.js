var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');

var appData = require('../utils/app-data.js');
var config = require('../../config/config.js');
var db = require('../utils/db.js');
var enumerable = require('../utils/enumerable.js');
var shell = require('../utils/shell.js');

var BaseModel = require('./base-model.js');
var LeapAppsDbKey = 'leap_apps';

var LeapAppStates = enumerable.make([
  'Installing',
  'InstallFailed',
  'Ready',
  'Uninstalling',
  'UninstallFailed',
  'Uninstalled'
], 'LeapAppStates');

var LeapApp = BaseModel.extend({

  initialize: function() {
    if (this.get('state') === LeapApp.States.Installing) {
      this.set('state', LeapApp.States.InstallFailed);
    }

    if (this.get('state') === LeapApp.States.Uninstalling) {
      this.set('state', LeapApp.States.UninstallFailed);
    }

    this.on('change:state', function() {
      if (!this.get('installedAt') &&
          this.get('state') === LeapApp.States.Installing) {
        this.set('installedAt', (new Date()).getTime());
        uiGlobals.leapApps.sort();
      }
      this.save();
    }.bind(this));
  },

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
    return 'b_' + (9999999999999 - (this.get('installedAt') || 9999999999999));
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

  install: function(cb) {
    throw new Error('install is an abstract method');
  },

  uninstall: function(deleteData, cb) {
    throw new Error('uninstall is an abstract method');
  },

  launch: function() {
    var command = this.get('executable');
    if (!command) {
      throw new Error("Don't know how to launch app: " + this.get('name'));
    } else {
      console.log('Launching app with command: ' + command);
    }

    return exec(shell.escape(command));
  },

  standardIconPath: function() {
    return appData.pathForFile(config.AppSubdir.AppIcons, this.get('id') + '.png');
  },

  standardTilePath: function() {
    return appData.pathForFile(config.AppSubdir.AppTiles, this.get('id') + '.png');
  }

});

LeapApp.States = LeapAppStates;

module.exports = LeapApp;

module.exports.hydrateCachedModels = function() {
  var cachedApps = JSON.parse(db.getItem(LeapAppsDbKey) || '[]');
  console.log('Cached apps to restore: ' + cachedApps.length);
  cachedApps.forEach(function(appArgs) {
    try {
      console.log('Restoring cached model ' + appArgs.id + ': ' + JSON.stringify(appArgs));
      uiGlobals.leapApps.add(appArgs);
    } catch (err) {
      console.error('Error restoring leapApp model: ' + err.message);
      console.error('Corrupted leapApp model: ' + JSON.stringify(appArgs));
      console.dir(err);
    }
  });
};

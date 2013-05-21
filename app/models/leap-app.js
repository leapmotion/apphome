var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');

var appData = require('../utils/app-data.js');
var config = require('../../config/config.js');
var db = require('../utils/db.js');
var enumerable = require('../utils/enumerable.js');
var semver = require('../utils/semver.js');
var shell = require('../utils/shell.js');

var BaseModel = require('./base-model.js');
var InstalledAppsDbKey = 'installed_apps';
var UninstalledAppsDbKey = 'uninstalled_apps';

var LeapAppStates = enumerable.make([
  'NotYetInstalled',
  'Installing',
  'InstallFailed',
  'Ready',
  'Uninstalling',
  'UninstallFailed',
  'Uninstalled'
], 'LeapAppStates');

var LeapApp = BaseModel.extend({

  initialize: function() {
    if (!this.get('state')) {
      this.set('state', LeapApp.States.NotYetInstalled);
    } else if (this.get('state') === LeapApp.States.Installing) {
      this.set('state', LeapApp.States.InstallFailed);
    } else if (this.get('state') === LeapApp.States.Uninstalling) {
      this.set('state', LeapApp.States.UninstallFailed);
    }

    this.on('change:state', function() {
      if (!this.get('installedAt') &&
          this.get('state') === LeapApp.States.Installing) {
        this.set('installedAt', (new Date()).getTime());
        uiGlobals.installedApps.sort();
      }
      if (this.get('state') === LeapApp.States.Uninstalled) {
        var appId = this.get('appId');
        if (appId) {
          var availableUpgrade = uiGlobals.availableDownloads.findWhere({ appId: appId });
          if (availableUpgrade) {
            uiGlobals.availableDownloads.remove(availableUpgrade);
          }
        }
        uiGlobals.installedApps.remove(this);
        uiGlobals.uninstalledApps.add(this);
      }
      this.save();
    }.bind(this));
  },

  save: function() {
    // note: persisting all apps for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    var installedAppsToPersist = uiGlobals.installedApps.filter(function(app) {
      return !app.isBuiltinTile();
    });
    db.setItem(InstalledAppsDbKey, JSON.stringify(_(installedAppsToPersist).invoke('toJSON')));
    db.setItem(UninstalledAppsDbKey, JSON.stringify(uiGlobals.uninstalledApps.toJSON()))
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

  isUninstalled: function() {
    return this.get('state') === LeapApp.States.Uninstalled;
  },

  isUninstallable: function() {
    return !this.isUninstalled() && !this.isBuiltinTile() && !this.isUpgrade();
  },

  isInstallable: function() {
    return this.get('state') === LeapApp.States.NotYetInstalled || this.isUninstalled();
  },

  isRunnable: function() {
    return this.get('state') === LeapApp.States.Ready;
  },

  isUpgrade: function() {
    return this.isStoreApp() && !!this.findAppToUpgrade();
  },

  findAppToUpgrade: function() {
    var appToUpgrade = uiGlobals.installedApps.findWhere({ appId: this.get('appId') });
    if (appToUpgrade && semver.isFirstGreaterThanSecond(this.get('version'), appToUpgrade.get('version'))) {
      return appToUpgrade;
    } else {
      return null;
    }
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

LeapApp.hydrateCachedModels = function() {
  uiGlobals.installedApps.add(JSON.parse(db.getItem(InstalledAppsDbKey) || '[]'));
  uiGlobals.uninstalledApps.add(JSON.parse(db.getItem(UninstalledAppsDbKey) || '[]'));
};

module.exports = LeapApp;

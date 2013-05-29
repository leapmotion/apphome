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

var LeapAppStates = enumerable.make([
  'NotYetInstalled',
  'Downloading',
  'Installing',
  'Ready',
  'Uninstalling',
  'Uninstalled'
], 'LeapAppStates');

var LeapApp = BaseModel.extend({

  initialize: function() {
    if (!this.get('state')) {
      this.set('state', LeapApp.States.NotYetInstalled);
    } else if (this.get('state') === LeapApp.States.Installing) {
      this.set('state', LeapApp.States.NotYetInstalled);
    } else if (this.get('state') === LeapApp.States.Uninstalling) {
      this.set('state', LeapApp.States.Uninstalled);
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
    db.setItem(config.DbKeys.InstalledApps, JSON.stringify(_(installedAppsToPersist).invoke('toJSON')));
    db.setItem(config.DbKeys.UninstalledApps, JSON.stringify(uiGlobals.uninstalledApps.toJSON()))
  },

  sortScore: function() {
    return 'b_' + (this.get('installedAt') || this.get('name'));
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
    var executable = this.get('executable');
    if (!executable) {
      throw new Error("Don't know how to launch app: " + this.get('name'));
    } else {
      console.log('Launching app: ' + executable);
    }

    nwGui.Shell.openItem(executable);
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
  uiGlobals.installedApps.add(JSON.parse(db.getItem(config.DbKeys.InstalledApps) || '[]'));
  uiGlobals.uninstalledApps.add(JSON.parse(db.getItem(config.DbKeys.UninstalledApps) || '[]'));
};

module.exports = LeapApp;

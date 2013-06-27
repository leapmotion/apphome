var exec = require('child_process').exec;
var fs = require('fs');
var markdown = require('markdown').markdown;
var os = require('os');

var appData = require('../utils/app-data.js');
var config = require('../../config/config.js');
var db = require('../utils/db.js');
var download = require('../utils/download.js');
var enumerable = require('../utils/enumerable.js');
var mixpanel = require('../utils/mixpanel.js');
var semver = require('../utils/semver.js');
var shell = require('../utils/shell.js');
var url = require('url');

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
    } else if (this.get('state') === LeapApp.States.Installing ||
               this.get('state') === LeapApp.States.Downloading) {
      this.set('state', LeapApp.States.NotYetInstalled);
      process.nextTick(function() {
        uiGlobals.installedApps.remove(this);
        uiGlobals.availableDownloads.add(this);
      }.bind(this));
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

    this.on('change:iconUrl', function() {
      if (this.get('iconUrl')) {
        this.downloadIcon();
      }
    }.bind(this));

    this.on('change:tileUrl', function() {
      if (this.get('tileUrl')) {
        this.downloadTile();
      }
    }.bind(this));

    if (!this.get('tilePath') && this.get('tileUrl')) {
      this.downloadTile(false, function() {
        if (!this.get('iconPath') && this.get('iconUrl')) {
          this.downloadIcon();
        }
      }.bind(this));
    } else if (!this.get('iconPath') && this.get('iconUrl')) {
      this.downloadIcon();
    }
  },

  save: function() {
    // note: persisting all apps for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    db.setItem(config.DbKeys.InstalledApps, JSON.stringify(uiGlobals.installedApps.toJSON()));
    db.setItem(config.DbKeys.UninstalledApps, JSON.stringify(uiGlobals.uninstalledApps.toJSON()))
  },

  sortScore: function() {
    return (this.isBuiltinTile() ? 'a_' + this.get('name') : 'b_' + (this.get('installedAt') || this.get('name')));
  },

  isLocalApp: function() {
    return false;
  },

  isStoreApp: function() {
    return false;
  },

  isWebLinkApp: function() {
    return false;
  },

  isBuiltinTile: function() {
    return false;
  },

  isUninstalled: function() {
    return this.get('state') === LeapApp.States.Uninstalled;
  },

  isUninstallable: function() {
    return this.get('state') === LeapApp.States.Ready && !this.isBuiltinTile();
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

  install: function() {
    throw new Error('install is an abstract method');
  },

  uninstall: function() {
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

    var eventToTrack = this.get('eventToTrack');
    if (eventToTrack) {
      mixpanel.trackEvent(eventToTrack);
    }
  },

  standardIconPath: function() {
    return appData.pathForFile(config.AppSubdir.AppIcons, this.get('id') + '.png');
  },

  standardTilePath: function() {
    return appData.pathForFile(config.AppSubdir.AppTiles, this.get('id') + '.png');
  },

  downloadIcon: function(force, cb) {
    this._downloadAsset(force, 'iconUrl', 'iconPath', this.standardIconPath(), cb);
  },

  downloadTile: function(force, cb) {
    this._downloadAsset(force, 'tileUrl', 'tilePath', this.standardTilePath(), cb);
  },

  _downloadAsset: function(force, urlAttrName, pathAttrName, destPath, cb) {
    if (!force && fs.existsSync(destPath)) {
      this.set(pathAttrName, destPath);
      this.save();
      cb && cb(null);
    } else {
      var assetUrl = this.get(urlAttrName);
      if (assetUrl) {
        console.log('Downloading asset for app ' + this.get('name') + ' (' + urlAttrName + '): ' + assetUrl);
        if (url.parse(assetUrl).protocol == null) {
          console.log('local asset detected, copying from ', './tmp/' + assetUrl, 'to', destPath);
          fs.renameSync('./tmp/' + assetUrl, destPath);
          this.set(pathAttrName, destPath);
          this.save();
          cb && cb(null);
          return;
        }
        download.get(assetUrl, destPath, function(err) {
          if (err && fs.existsSync(destPath)) {
            try {
              fs.unlinkSync(destPath);
            } catch(err2) {
              return cb && cb(err2);
            }
          } else if (!err) {
            this.set(pathAttrName, destPath);
            this.save();
          }
          cb && cb(err || null);
        }.bind(this));
      } else {
        cb && cb(new Error('Asset url is undefined.'));
      }
    }
  },

  cleanAppName: function() {
    return (this.get('name') || '').replace(/[^A-Za-z0-9]/g, '');
  },

  showIcon: function() {
    return this.get('iconPath') && (!this.isStoreApp() || !this.get('tilePath'));
  },

  getMarkdown: function(attrName) {
    try {
      var rawMarkdown = (this.get(attrName) || '').replace(/<\s*br[\s\/]*>/g, ''); // strip <br> tags
      return markdown.renderJsonML(markdown.toHTMLTree(markdown.parse(rawMarkdown)));
    } catch (e) {
      return this.get(attrName) || '';
    }
  }

});

LeapApp.States = LeapAppStates;

LeapApp.hydrateCachedModels = function() {
  uiGlobals.installedApps.add(JSON.parse(db.getItem(config.DbKeys.InstalledApps) || '[]'));
  uiGlobals.uninstalledApps.add(JSON.parse(db.getItem(config.DbKeys.UninstalledApps) || '[]'));
};

module.exports = LeapApp;

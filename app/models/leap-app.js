var exec = require('child_process').exec;
var fs = require('fs');
var markdown = require('markdown').markdown;
var os = require('os');
var path = require('path');

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
  'Waiting',
  'Connecting',
  'Downloading',
  'Installing',
  'Ready',
  'Uninstalling',
  'Uninstalled'
], 'LeapAppStates');

var LeapApp = BaseModel.extend({

  initialize: function() {
    var state = this.get('state');
    if (!state ||
        state === LeapApp.States.Waiting ||
        state === LeapApp.States.Connecting ||
        state === LeapApp.States.Downloading ||
        state === LeapApp.States.Installing) {
      this.set('state', LeapApp.States.NotYetInstalled);
    } else if (state === LeapApp.States.Uninstalling) {
      this.set('state', LeapApp.States.Uninstalled);
    }

    this.on('change:state', function() {
      var state = this.get('state');
      if (!this.get('installedAt') && state !== LeapApp.States.NotYetInstalled) {
        this.set('installedAt', (new Date()).getTime());
        uiGlobals.myApps.sort();
      } else if (state === LeapApp.States.Uninstalled) {
        this.set('installedAt', null);
        uiGlobals.myApps.sort();
      }
      this.save();
    }.bind(this));

    this.on('change:iconUrl', function() {
      if (this.get('iconUrl')) {
        this.downloadIcon(true);
      }
    }.bind(this));

    this.on('change:tileUrl', function() {
      if (this.get('tileUrl')) {
        this.downloadTile(true);
      }
    }.bind(this));

    this.on('add', function() {
      if (!this.get('tilePath') && this.get('tileUrl')) {
        this.downloadTile(true, function() {
          if (!this.get('iconPath') && this.get('iconUrl')) {
            this.downloadIcon(true);
          }
        }.bind(this));
      } else if (!this.get('iconPath') && this.get('iconUrl')) {
        this.downloadIcon(true);
      }
    }.bind(this));
  },

  save: function() {
    // note: persisting all apps for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    db.saveObj(config.DbKeys.InstalledApps, uiGlobals.myApps.toJSON());
  },

  sortScore: function() {
    return (this.isBuiltinTile() ?
              'a_' + this.get('name') :
              (this.get('installedAt') ?
                'b_' + this.get('installedAt') :
                (!this.isUninstalled() ? 'c_' : 'd_') + this.get('firstSeenAt')));
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
    return this.get('state') === LeapApp.States.NotYetInstalled ||
           this.isUninstalled();
  },

  isInstalled: function() {
    return this.get('state') === LeapApp.States.Ready;
  },

  isRunnable: function() {
    return this.get('state') === LeapApp.States.Ready;
  },

  isUpgradable: function() {
    return !!this.get('availableUpgrade');
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
    return this._standardAssetPath(config.AppSubdir.AppIcons);
  },

  standardTilePath: function() {
    return this._standardAssetPath(config.AppSubdir.AppTiles);
  },

  _standardAssetPath: function(dir) {
    if (typeof dir !== 'string') {
      console.warn('Invalid directory: ' + dir);
      return null;
    }
    try {
      var filename = (this.isStoreApp() ? this.get('versionId') : this.get('id')) + '.png';
      return appData.pathForFile(dir, filename);
    } catch (err) {
      console.error('Error with asset path: ' + (err.stack || err));
      return null; // so app knows to try again
    }
  },

  downloadIcon: function(force, cb) {
    this._downloadAsset(force, 'iconUrl', 'iconPath', this.standardIconPath(), cb);
  },

  downloadTile: function(force, cb) {
    this._downloadAsset(force, 'tileUrl', 'tilePath', this.standardTilePath(), cb);
  },

  _downloadAsset: function(force, urlAttrName, pathAttrName, destPath, cb) {
    try {
      if (!force && fs.existsSync(destPath)) {
        this.set(pathAttrName, destPath);
        this.save();
        cb && cb(null);
      } else {
        var assetUrl = this.get(urlAttrName);
        if (assetUrl) {
          console.log('Downloading asset for app ' + this.get('name') + ' (' + urlAttrName + '): ' + assetUrl);
          if (url.parse(assetUrl).protocol == null) {
            var sourceFile = path.join(config.PlatformTempDirs[os.platform()], 'frozen', assetUrl);
            console.log('local asset detected, copying from ', sourceFile, 'to', destPath);
            fs.renameSync(sourceFile, destPath);
            this.set(pathAttrName, destPath);
            this.save();
            cb && cb(null);
            return;
          }
          download.getToDisk(assetUrl, { destPath: destPath }, function(err) {
            try {
              if (err && fs.existsSync(destPath)) {
                try {
                  fs.unlinkSync(destPath);
                } catch (err2) {
                  console.error('leap-app.js#_downloadAsset. unlinkSync failed. ' + (err2.stack || err2));
                  return cb && cb(err2);
                }
              } else if (!err) {
                this.set(pathAttrName, destPath);
                this.save();
              }
            } catch (err3) { // todo: improve nested error catching.. in a hurry
              console.error('leap-app.js#_downloadAsset failed during download ' + (err3.stack || err3));
              err = err3;
            }
            cb && cb(err || null);
          }.bind(this));
        } else {
          cb && cb(new Error('Asset url is undefined.'));
        }
      }
    } catch (err) {
      console.error('leap-app.js#_downloadAsset. Unknown error. ' + (err.stack || err));
      cb && cb(err);
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
    } catch (err) {
      console.error('LeapApp#getMarkdown failed.' + (err.stack || err));
      return this.get(attrName) || '';
    }
  }

});

LeapApp.States = LeapAppStates;

LeapApp.hydrateCachedModels = function() {
  console.log('Rehydrating leap apps from database');
  var installedAppsJson = db.fetchObj(config.DbKeys.InstalledApps) || [];
  installedAppsJson.forEach(function(appJson) {
    try {
      uiGlobals.myApps.add(appJson);
    } catch (err) {
      console.error('corrupt app data in database: ' + appJson);
      console.error('Error: ' + (err.stack || err));
    }
  });

};

module.exports = LeapApp;

var exec = require('child_process').exec;
var fs = require('fs');
var markdown = require('markdown').markdown;
var os = require('os');
var path = require('path');
var url = require('url');

var appData = require('../utils/app-data.js');
var config = require('../../config/config.js');
var db = require('../utils/db.js');
var httpHelper = require('../utils/http-helper.js');
var enumerable = require('../utils/enumerable.js');
var mixpanel = require('../utils/mixpanel.js');
var semver = require('../utils/semver.js');
var shell = require('../utils/shell.js');
var workingFile = require('../utils/working-file.js');

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
        this.downloadIcon();
      }
    }.bind(this));

    this.on('change:tileUrl', function() {
      if (this.get('tileUrl')) {
        this.downloadTile();
      }
    }.bind(this));

    this.on('add', function() {
      if (this._shouldDownloadTile()) {
        this.downloadTile(function() {
          if (this._shouldDownloadIcon()) {
            this.downloadIcon();
          }
        }.bind(this));
      } else if (this._shouldDownloadIcon()) {
        this.downloadIcon();
      }
    }.bind(this));
  },

  save: function() {
    var uninstalledAppsJson = uiGlobals.uninstalledApps.toJSON();
    var myAppsJson = uiGlobals.myApps.toJSON();

    uninstalledAppsJson.forEach(LeapApp.abstractUserHomeDir);
    myAppsJson.forEach(LeapApp.abstractUserHomeDir);

    // note: persisting all apps for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    db.saveObj(config.DbKeys.UninstalledApps, uiGlobals.uninstalledApps.toJSON());
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

  hasUpdate: function() {
    return !!this.get('availableUpdate');
  },

  isUpdatable: function() {
    return this.hasUpdate() && (this.get('state') === LeapApp.States.Ready);
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

  _shouldDownloadTile: function() {
    try {
      var tilePath = this.get('tilePath');
      return this.get('tileUrl') &&
             (!tilePath ||
              !fs.existsSync(tilePath));
    } catch(err) {
      return true;
    }
  },

  _shouldDownloadIcon: function() {
    try {
      var iconPath = this.get('iconPath');
      return this.get('iconUrl') &&
             (!iconPath ||
              !fs.existsSync(iconPath));
    } catch(err) {
      return true;
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

  getShortDescription: function() {
    if (this.get('tagline')) {
      return this.get('tagline');
    }

    var fullDescription = this.get('description');

    if (typeof fullDescription === 'undefined') {
      return '';
    }

    // Strip tags
    fullDescription = fullDescription.replace(/(<([^>]+)>)/ig,"");

    var isSentence = fullDescription.match(/(\. |\n)+(\w[^\.!\n]+ is \w[^\.!]+?[\.!])\s*/);
    if (isSentence && (isSentence[2].length < 60)) {
      // Two sentences
      isSentence = fullDescription.match(/(\. |\n)+(\w[^\.!\n]+ is \w[^\.!]+?[\.!] +\w[^\.!\n]+?[\.!])/);
    }

    var firstSentence = fullDescription.match(/(\. |\n)+(\w[^\.!\n]+?[\.!])\s*/);
    if (firstSentence && (firstSentence[2].length < 60)) {
      // Two sentences
      firstSentence = fullDescription.match(/(\. |\n)+(\w[^\.!\n]+?\. +\w[^\.!\n]+?[\.!])/);
    }

    var sentence = (isSentence && isSentence[2]) || (firstSentence && firstSentence[2]);

    var shortDescription = sentence || fullDescription.split('#').join('').split('\n')[0];

    return $.trim(shortDescription.split('\n').join(' '));
  },

  downloadIcon: function(cb) {
    this._downloadAsset('iconUrl', 'iconPath', this.standardIconPath(), cb);
  },

  downloadTile: function(cb) {
    this._downloadAsset('tileUrl', 'tilePath', this.standardTilePath(), cb);
  },

  _downloadAsset: function(urlAttrName, pathAttrName, destPath, cb) {
    var assetUrl = this.get(urlAttrName);
    if (assetUrl) {
      console.log('Getting asset for app ' + this.get('name') + ' (' + urlAttrName + '): ' + assetUrl);
      if (url.parse(assetUrl).protocol == null) {
        var sourcePath = path.join(config.PlatformTempDirs[os.platform()], 'frozen', assetUrl);
        var err = this._moveAssetToAppDataDir(sourcePath, destPath, pathAttrName);
        cb && cb(err);
      } else {
        var tempPath = workingFile.newTempFilePath('png');
        httpHelper.getToDisk(assetUrl, { destPath: tempPath }, function(err) {
          if (!err) {
            err = this._moveAssetToAppDataDir(tempPath, destPath, pathAttrName);
          } else {
            console.error(err.stack || err);
          }
          cb && cb(err);
        }.bind(this));
      }
    } else {
      cb && cb(new Error('Asset url is undefined.'));
    }
  },

  _moveAssetToAppDataDir: function(sourcePath, destPath, pathAttrName) {
    try {
      fs.renameSync(sourcePath, destPath);
      this.set(pathAttrName, destPath, { silent: true });
      this.trigger('change:' + pathAttrName);
      this.save();
      return null;
    } catch(err) {
      console.error('Failed to move asset to ' + this.get('name') + ' data dir: ' + (err.stack || err));
      return err;
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

  var userHomeDir = config.UserHomeDirs[os.platform()];

  function populateCollectionFromDb(dbKey, targetCollection) {
    var appJsonList = db.fetchObj(dbKey) || [];
    appJsonList.forEach(function(appJson) {
      try {
        if (appJson.executable) {
          appJson.executable = appJson.executable.replace(/^%USER_DIR%/, userHomeDir);
        }
        if (appJson.state === LeapApp.States.Uninstalled) {
          uiGlobals.uninstalledApps.add(appJson);
        } else {
          targetCollection.add(appJson);
        }
      } catch (err) {
        console.error('corrupt app data in database: ' + appJson);
        console.error('Error: ' + (err.stack || err));
      }
    });
  }

  populateCollectionFromDb(config.DbKeys.InstalledApps, uiGlobals.myApps);
  populateCollectionFromDb(config.DbKeys.UninstalledApps, uiGlobals.uninstalledApps);

  console.log('Done hydrating!');
};

LeapApp.abstractUserHomeDir = function(appJson) {
  var userHomeDir = config.UserHomeDirs[os.platform()];

  // If user changes username, app directory prefix can change.
  if (appJson.executable && appJson.executable.indexOf(userHomeDir) === 0) {
    appJson.executable = appJson.executable.replace(userHomeDir, '%USER_DIR%');
  }
};

module.exports = LeapApp;

var fs = require('fs-extra');
var path = require('path');

var LeapAppCollection = require('./models/leap-app-collection.js');
var LeapApp = require('./models/leap-app.js');
var AuthorizationView = require('./views/authorization/authorization.js');
var PageContainerView = require('./views/page-container/page-container.js');

var oauth = require('./utils/oauth.js');
var uiGlobals = require('./ui-globals.js');
var BuiltinTileApp = require('./models/builtin-tile-app.js');
var appData = require('./utils/app-data.js');
global.CONFIG = require('../config/config.js');

function AppController() {
}

AppController.prototype = {

  runApp: function() {

    this._setupGlobals();
    this._assureAppDataSubdirs();
    this._authorize(function(err, accessToken) {
      console.log(err ? 'ERROR: ' + err : 'Access Token: ' + accessToken);
      this._paintPage();
    }.bind(this));
  },

  _setupGlobals: function() {
    global.uiGlobals = uiGlobals;
    uiGlobals.leapApps = new LeapAppCollection();
  },

  _paintPage: function() {
    $('body').append((new PageContainerView()).$el);
    BuiltinTileApp.createBuiltinTiles();
    LeapApp.hydrateCachedModels();
  },

  _authorize: function(cb) {
    oauth.getAccessToken(function(err, accessToken) {
      if (err) {
        var authorizationView = new AuthorizationView();
        authorizationView.authorize(function(err) {
          if (err) {
            cb && cb(err);
          } else {
            this._authorize(cb);
          }
        }.bind(this));
      } else {
        cb(null, accessToken)
      }
    }.bind(this));
  },
  
  _assureAppDataSubdirs: function() {
    try {
      _(CONFIG.AppSubdir).each(function(subdirName) {
        fs.mkdirsSync(appData.pathForFile(subdirName));
      });
    } catch (err) {
      console.error('Trouble creating subdirs: ' + err);
      uiGlobals.trigger(uiGlobals.Event.DiskWriteError);
    }
  }  

};

var appController;

$(window).load(function() {
  appController = new AppController();
  appController.runApp();
});

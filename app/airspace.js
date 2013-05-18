var fs = require('fs');
var path = require('path');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapAppCollection = require('./models/leap-app-collection.js');
var LeapApp = require('./models/leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var PageContainerView = require('./views/page-container/page-container.js');

var oauth = require('./utils/oauth.js');
var uiGlobals = require('./ui-globals.js');

function AppController() {
}

AppController.prototype = {

  runApp: function() {
    this._setupGlobals();
    this._initializeState();
    this._authorize(function(err, accessToken) {
      console.log(err ? 'ERROR: ' + err : 'Access Token: ' + accessToken);
      this._paintPage();
    }.bind(this));
  },

  _setupGlobals: function() {
    global.uiGlobals = uiGlobals;
    global.CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'config.json'), 'utf-8'));
    uiGlobals.leapApps = new LeapAppCollection();
  },

  _paintPage: function() {
    $('body').append((new PageContainerView()).$el);
  },

  _initializeState: function() {
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
  }

};

var appController;

$(window).load(function() {
  appController = new AppController();
  appController.runApp();
});

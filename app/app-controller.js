var oauth = require('./utils/oauth.js');

var BuiltinTileApp = require('./models/builtin-tile-app.js');
var LeapApp = require('./models/leap-app.js');

var AuthorizationView = require('./views/authorization/authorization.js');
var PageContainerView = require('./views/page-container/page-container.js');

function AppController() {
}

AppController.prototype = {

  runApp: function() {
    BuiltinTileApp.createBuiltinTiles();
    LeapApp.hydrateCachedModels();

    this._authorize(function(err, accessToken) {
      console.log(err ? 'ERROR: ' + err : 'Access Token: ' + accessToken);
      this._paintPage();
    }.bind(this));
  },

  _paintPage: function() {
    $('body').append((new PageContainerView()).$el);
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

module.exports = AppController;

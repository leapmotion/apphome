var api = require('./api.js');
var installManager = require('./install-manager.js');
var oauth = require('./oauth.js');
var pubnub = require('./pubnub.js');
var windowChrome = require('./window-chrome.js');

var AuthorizationView = require('../views/authorization/authorization.js');

function withAuthorization(cb) {
  if (!oauth.getRefreshToken()) {
    oauth.getAccessToken(cb);
  } else {
    cb && cb(null);
  }
}


function logOutUser() {
  installManager.cancelAll();
  pubnub.unsubscribeAll();
  windowChrome.rebuildMenuBar(false);
  if (uiGlobals.mainPageView) {
    uiGlobals.mainPageView.$el.remove();
    uiGlobals.mainPageView.remove();
  }

  if (uiGlobals.authView) {
    uiGlobals.authView.remove();
    uiGlobals.authView = null;
  }
  uiGlobals.authView = new AuthorizationView();
  uiGlobals.authView.logOut(function() {
    uiGlobals.authView.remove();
    uiGlobals.authView = null;
    withAuthorization(function() {
      windowChrome.paintMainPage();
      api.connectToStoreServer();
    }.bind(this));
  }.bind(this));
}


module.exports.logOutUser = logOutUser;
module.exports.withAuthorization = withAuthorization;
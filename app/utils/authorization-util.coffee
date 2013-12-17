api = require './api.js'
installManager = require './install-manager.js'
oauth = require './oauth.js'
pubnub = require './pubnub.js'
windowChrome = require './window-chrome.js'

AuthorizationView = require '../views/authorization/authorization.js'

withAuthorization = (cb) ->
  if not oauth.getRefreshToken()
    oauth.getAccessToken cb;
  else
    cb? null


logOutUser = ->
  do installManager.cancelAll
  do pubnub.unsubscribeAll

  windowChrome.rebuildMenuBar false

  if uiGlobals.mainPageView
    do uiGlobals.mainPageView.$el.remove
    do uiGlobals.mainPageView.remove

  authView = new AuthorizationView();
  authView.logOut ->
    do authView.remove
    withAuthorization ->
      do windowChrome.paintMainPage
      do api.connectToStoreServer

module.exports.logOutUser = logOutUser
module.exports.withAuthorization = withAuthorization

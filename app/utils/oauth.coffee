httpHelper = require("./http-helper.js")
qs = require("querystring")
url = require("url")
config = require("../../config/config.js")
db = require("./db.js")
AuthorizationView = require("../views/authorization/authorization.js")

saveRefreshToken = (refreshToken) ->
  db.setItem config.DbKeys.OauthRefreshToken, refreshToken

getRefreshToken = ->
  db.getItem config.DbKeys.OauthRefreshToken

getAuthorizationUrl = ->
  params =
    response_type: "code"
    client_id: config.oauth.client_id
    redirect_uri: config.oauth.redirect_uri

  config.oauth.endpoint + "authorize/?" + qs.stringify(params)

oauthRequest = (params, cb) ->
  params = _.extend {}, params,
    client_id: config.oauth.client_id
    client_secret: config.oauth.client_key
    redirect_uri: config.oauth.redirect_uri

  urlParts = url.parse(config.oauth.endpoint)
  urlParts.pathname += "token"

  httpHelper.post((url.format urlParts), params).then (data) ->
    data = JSON.parse data
  .nodeify cb

authorizeWithCode = (code, cb) ->
  oauthRequest
    grant_type: "authorization_code"
    code: code
  , (err, result) ->
    if err
      cb?(err)
    else if result.error
      cb?(new Error(result.error_description))
    else
      saveRefreshToken result.refresh_token
      cb?(null)

promptingForLogin = undefined
promptForLogin = (cb) ->
  promptingForLogin = true

  if uiGlobals.mainPageView
    do uiGlobals.mainPageView.$el.remove
    do uiGlobals.mainPageView.remove

  authorizationView = new AuthorizationView()
  authorizationView.authorize (err) ->
    console.warn "Error logging in: " + err.stack or err  if err
    do authorizationView.remove
    do require('./window-chrome.js').paintMainPage
    promptingForLogin = false
    cb?(null) # skip auth if there's an error

accessTokenExpiry = undefined
accessToken = undefined
getAccessToken = (cb) ->
  now = (new Date()).getTime()
  if accessToken and accessTokenExpiry and (now < accessTokenExpiry)
    console.log "Using cached OAUTH access token."
    cb?(null, accessToken)
    return

  console.log "Getting OAUTH access token."

  if not getRefreshToken() and not promptingForLogin
    promptForLogin ->
      getAccessToken cb

  else
    oauthRequest
      grant_type: "refresh_token"
      refresh_token: getRefreshToken()
    , (err, result) ->
      if err
        cb?(err)
      else if result.error
        if promptingForLogin
          cb?(new Error(result.error))
        else
          promptForLogin ->
            getAccessToken cb
      else
        accessToken = result.access_token
        accessTokenExpiry = now + config.oauth.auth_token_expiration_time
        cb?(null, accessToken)

logOut = ->
  db.removeItem config.DbKeys.OauthRefreshToken
  accessToken = null

logOutUrl = ->
  config.oauth.log_out_url



module.exports.getAuthorizationUrl = getAuthorizationUrl
module.exports.getRefreshToken = getRefreshToken
module.exports.authorizeWithCode = authorizeWithCode
module.exports.getAccessToken = getAccessToken
module.exports.logOut = logOut
module.exports.logOutUrl = logOutUrl

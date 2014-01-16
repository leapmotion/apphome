async = require("async")
domain = require("domain")
fs = require("fs-extra")
os = require("os")
path = require("path")
qs = require("querystring")
url = require("url")

Q = require("q")

config = require("../../config/config.js")
db = require("./db.js")
drm = require("./drm.js")
enumerable = require("./enumerable.js")
httpHelper = require("./http-helper.js")
installManager = require("./install-manager.js")
oauth = require("./oauth.js")
pubnub = require("./pubnub.js")

LeapApp = require("../models/leap-app.js")


NodePlatformToServerPlatform =
  darwin: "osx"
  win32: "windows"

ServerPlatformToNodePlatform = {}
Object.keys(NodePlatformToServerPlatform).forEach (key) ->
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key

appsAdded = 0

cleanAppJson = (appJson) ->
  appJson = appJson or {}
  releaseDate = appJson.certified_at or appJson.created_at
  cleanedAppJson =
    id: appJson.app_id
    appId: appJson.app_id
    versionId: appJson.id
    appType: appJson.appType
    name: appJson.name
    platform: ServerPlatformToNodePlatform[appJson.platform] or appJson.platform
    iconUrl: appJson.icon_url
    tileUrl: appJson.tile_url
    binaryUrl: appJson.binary_url
    version: appJson.version_number
    changelog: appJson.changelog
    description: appJson.description
    tagline: appJson.tagline
    releaseDate: (if releaseDate then new Date(releaseDate).toLocaleDateString() else null)
    noAutoInstall: appJson.noAutoInstall
    cleaned: true

  Object.keys(cleanedAppJson).forEach (key) ->
    delete cleanedAppJson[key]  unless cleanedAppJson[key]

  cleanedAppJson

handleAppJson = (appJson, silent=false) ->
  unless appJson.cleaned
    appJson = cleanAppJson appJson

  unless appJson.urlToLaunch? or appJson.findByScanning? or (appJson.platform? and appJson.platform is os.platform())
    console.log "Skipping invalid app for this platform:", appJson.name
    return

  myApps = uiGlobals.myApps
  uninstalledApps = uiGlobals.uninstalledApps
  existingApp = myApps.get(appJson.appId) or uninstalledApps.get(appJson.appId)
  if existingApp
    if appJson.versionId > existingApp.get("versionId")
      console.log "Upgrade available for " + existingApp.get("name") + ". New version: " + appJson.version
      existingApp.set "availableUpdate", appJson
    else
      existingApp.set appJson

    return existingApp
  else
    console.log 'Adding', appJson.name

    try
      app = myApps.add appJson,
        validate: true
        silent: silent
    catch err
      console.error "Corrupt app data from api: " + appJson + "\n" + (err.stack or err)

# Installs any new apps, updates properties for existing apps, and removes old apps
syncToCollection = (appJsonList, collection, appTest) ->
  existingAppsById = {}
  collection.forEach (app) ->
    if appTest app
      existingAppsById[app.get('name')] = app

  appJsonList.forEach (appJson) ->
    existingApp = existingAppsById[appJson.name]
    if existingApp
      delete existingAppsById[appJson.name]
      existingApp.set appJson
    else
      handleAppJson appJson

  # remove old apps
  _(existingAppsById).forEach (oldApp) ->
    collection.remove oldApp

  do collection.save

handleNotification = (notificationJson) ->
  console.log "got notification", notificationJson

subscribeToUserNotifications = (userId) ->
  pubnub.history 10, "notification", ->
    handleNotification.apply this, arguments

  pubnub.history 10, "notification", ->
    handleNotification.apply this, arguments

subscribeToUserChannel = (userId) ->
  pubnub.subscribe userId + ".user.purchased", (appJson) ->
    # steal focus
    nwGui.Window.get().focus()

    getAppJson(appJson.app_id).then (appJson) ->
      handleAppJson appJson
    .done()

subscribeToAppChannel = (appId) ->
  pubnub.subscribe appId + ".app.updated", (appJson) ->
    getAppJson(appJson.app_id).then (appJson) ->
      handleAppJson appJson
      installManager.showAppropriateDownloadControl()
    .done()

reconnectionPromise = undefined
reconnectAfterError = (err) ->
  console.log "Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (if err and err.stack then err.stack else err)
  return reconnectionPromise if reconnectionPromise?
  reconnectionPromise = connectToStoreServer.delay(config.ServerConnectRetryMs)
    .then ->
      reconnectionPromise = undefined

_getStoreManifest = ->
  reconnectionPromise = undefined

  Q.nfcall(oauth.getAccessToken).then (accessToken) ->
      platform = NodePlatformToServerPlatform[os.platform()] or os.platform()
      apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify
        access_token: accessToken
        platform: platform
      console.log "Getting store manifest from", apiEndpoint
      httpHelper.getJson(apiEndpoint).then (messages) ->
        if messages.errors
          reconnectAfterError new Error(messages.errors)
        else
          userInformation = messages.shift()
          messages = (cleanAppJson message for message in messages)
          messages.unshift userInformation
          messages
      , (reason) ->
        reconnectAfterError reason
  , (reason) ->
    reconnectAfterError reason

getNonStoreManifest = ->
  httpHelper.getJson(config.NonStoreAppManifestUrl).then (manifest) ->
    manifest.local = manifest[NodePlatformToServerPlatform[os.platform()]] or []

    for appJson in manifest.web
      appJson.cleaned = true
      appJson.appType = LeapApp.Types.WebApp

    for appJson in manifest.local
      appJson.cleaned = true
      appJson.appType = LeapApp.Types.LocalApp

    manifest
  , (reason) ->
    console.warn "Failed to get app manifest (retrying): " + err and err.stack
    Q.delay config.S3ConnectRetryMs
    .then ->
      do _getNonStoreManifest

_setGlobalUserInformation = (user) ->
  uiGlobals.username = user.username
  uiGlobals.email = user.email
  uiGlobals.user_id = user.user_id
  subscribeToUserChannel user.user_id
  subscribeToUserNotifications user.user_id
  uiGlobals.trigger uiGlobals.Event.SignIn

getUserInformation = (cb) ->
  _getStoreManifest (manifest) ->
    _setGlobalUserInformation manifest.shift()
    cb?(null)

connectToStoreServer = ->
  _getStoreManifest().then (messages) ->
    console.log "Connected to store server.", messages.length - 1, "apps found."
    $("body").removeClass "loading"

    _setGlobalUserInformation messages.shift();

    messages.forEach (message) ->
      _.defer ->
        drm.writeXml message.auth_id, message.secret_token  if message.auth_id and message.secret_token
        subscribeToAppChannel message.appId
        handleAppJson message

    installManager.showAppropriateDownloadControl

getAppJson = (appId) ->
  Q.nfcall(oauth.getAccessToken).then (accessToken) ->
    platform = NodePlatformToServerPlatform[os.platform()] or os.platform()
    url = config.AppListingEndpoint + "?" + qs.stringify
      access_token: accessToken
      platform: platform

    url = url.replace(":id", appId)

    console.log "Getting app details via url: " + url
    httpHelper.getJson(url).then (appJson) ->
      appJson.appType = LeapApp.Types.StoreApp
      cleanAppJson appJson

sendDeviceData = ->
  dataDir = config.PlatformLeapDataDirs[os.platform()]
  unless dataDir
    console.error "Leap Motion data dir unknown for operating system: " + os.platform()
    return Q.reject new Error "Leap Motion data dir unknown for operating system: " + os.platform()

  authDataFile = path.join(dataDir, "lastauth")

  Q.nfcall(fs.readFile, authDataFile, "utf-8").then (authData) ->
    unless authData
      console.warn "Auth data file is empty."
      throw new Error "Auth data file is empty."

    Q.nfcall(oauth.getAccessToken).then (accessToken) ->
      httpHelper.post config.DeviceDataEndpoint,
        access_token: accessToken
        data: authData
      .then ->
        console.log "Sent device data."
      , (reason) ->
        console.error "Failed to send device data: " + (reason.stack or reason)
        throw reason
    , (reason) ->
      console.warn "Failed to get an access token: " + (err.stack or err)
      throw reason
  , (reason) ->
    console.warn "Error reading auth data file."
    throw reason


sendAppVersionData = ->
  myAppsVersionData = uiGlobals.myApps.filter((app) ->
    app.isStoreApp()
  ).map((app) ->
    app_id: app.get("id")
    app_version_id: app.get("versionId")
    trashed: false
  )

  uninstalledAppsVersionData = uiGlobals.uninstalledApps.filter((app) ->
    app.isStoreApp()
  ).map((app) ->
    app_id: app.get("id")
    app_version_id: app.get("versionId")
    trashed: true
  )

  appVersionData = myAppsVersionData.concat(uninstalledAppsVersionData)

  console.log "Sending app version data for", appVersionData.length, 'apps.'

  Q.nfcall(oauth.getAccessToken).then (accessToken) ->
    httpHelper.post config.AppVersionDataEndpoint,
      access_token: accessToken
      installations: JSON.stringify(appVersionData)
    .then (result) ->
      console.log "Sent app version data.  Got " + result
    , (reason) ->
      console.error "Failed to send app version data: " + (reason.stack or reason)
      throw reason

parsePrebundledManifest = (manifest, cb) ->
  console.log "\n\n\nExamining prebundle manifest \n" + JSON.stringify(manifest or {}, null, 2)

  installationFunctions = []
  manifest.forEach (appJson) ->
    appJson.noAutoInstall = true
    appJson.cleaned = true
    app = handleAppJson appJson
    app.set "state", LeapApp.States.Waiting
    installationFunctions.push (callback) ->
      console.log "Installing prebundled app: " + app.get "name"
      app.install (err) ->
        if err
          console.error "Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + (err.stack or err)
        else
          getAppJson(app.get 'appId').then (appJson) ->
            app.set appJson
            do app.save
          .done()

          subscribeToAppChannel app.get("appId")
        callback null

  async.parallelLimit installationFunctions, 2, (err) ->
    installManager.showAppropriateDownloadControl()
    cb?(err)


module.exports.connectToStoreServer = connectToStoreServer
module.exports.getNonStoreManifest = getNonStoreManifest
module.exports.getUserInformation = getUserInformation
module.exports.getAppJson = getAppJson
module.exports.handleAppJson = handleAppJson
module.exports.syncToCollection = syncToCollection
module.exports.sendDeviceData = sendDeviceData
module.exports.sendAppVersionData = sendAppVersionData
module.exports.parsePrebundledManifest = parsePrebundledManifest

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
  app = undefined
  unless appJson.cleaned
    appJson = cleanAppJson appJson

  unless appJson.urlToLaunch? or appJson.findByScanning? or (appJson.platform? and appJson.platform is os.platform())
    console.log "Skipping invalid app for this platform:", appJson.name
    return

  myApps = uiGlobals.myApps
  uninstalledApps = uiGlobals.uninstalledApps
  existingApp = myApps.get(appJson.id) or uninstalledApps.get(appJson.id)
  if existingApp
    if appJson.versionId > existingApp.get("versionId")
      console.log "Upgrade available for " + existingApp.get("name") + ". New version: " + appJson.version
      existingApp.set "availableUpdate", appJson
    else
      existingApp.set appJson

    app = existingApp
  else
    console.log 'Adding', appJson.name

    try
      app = myApps.add appJson,
        validate: true
        silent: silent
    catch err
      console.error "Corrupt app data from api: " + appJson + "\n" + (err.stack or err)

  installManager.showAppropriateDownloadControl()
  return app

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
    .done()

reconnectionPromise = undefined
reconnectAfterError = (err) ->
  console.log "Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (err?.stack or err)
  return reconnectionPromise if reconnectionPromise?
  reconnectionPromise = Q.delay(config.ServerConnectRetryMs).then ->
    connectToStoreServer()
    reconnectionPromise = undefined

hydrateCachedModels = ->
  console.log 'Rehydrating leap apps from database'

  userHomeDir = config.UserHomeDirs[os.platform()]

  populateCollectionFromDb = (dbKey, targetCollection) ->
    appJsonList = db.fetchObj(dbKey) or []
    for appJson in appJsonList
      try
        if appJson.executable
          appJson.executable = appJson.executable.replace /^%USER_DIR%/, userHomeDir

        if appJson.state is LeapApp.States.Uninstalled
          uiGlobals.uninstalledApps.add appJson
        else
          handleAppJson appJson

      catch err
        console.error 'corrupt app data in database: ' + appJson
        console.error 'Error: ' + (err.stack or err)

  populateCollectionFromDb config.DbKeys.InstalledApps, uiGlobals.myApps
  populateCollectionFromDb config.DbKeys.UninstalledApps, uiGlobals.uninstalledApps

  console.log 'Done hydrating.'

_getStoreManifest = ->
  reconnectionPromise = undefined

  Q.nfcall(oauth.getAccessToken).then (accessToken) ->
    platform = NodePlatformToServerPlatform[os.platform()] or os.platform()
    apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify
      access_token: accessToken
      platform: platform
      language: uiGlobals.locale
    console.log "Getting store manifest from", apiEndpoint
    httpHelper.getJson(apiEndpoint).then (messages) ->
      if messages.errors
        reconnectAfterError new Error(messages.errors)
      else
        userInformation = messages.shift()

        messages = for appJson in messages
          appJson.appType = LeapApp.Types.StoreApp
          cleanAppJson appJson

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
      appJson.platform = os.platform()

    manifest
  , (reason) ->
    console.warn "Failed to get app manifest (retrying): " + reason?.stack or reason
    Q.delay(config.S3ConnectRetryMs).then ->
      do getNonStoreManifest

_setGlobalUserInformation = (user) ->
  drm.writeXml user.auth_id, user.secret_token

  uiGlobals.username = user.username
  uiGlobals.email = user.email
  uiGlobals.user_id = user.user_id
  subscribeToUserChannel user.user_id
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

        subscribeToAppChannel message.appId
        handleAppJson message

getAppJson = (appId) ->
  Q.nfcall(oauth.getAccessToken).then (accessToken) ->
    platform = NodePlatformToServerPlatform[os.platform()] or os.platform()
    url = config.AppJsonEndpoint + "?" + qs.stringify
      access_token: accessToken
      platform: platform
      langauge: uiGlobals.locale

    url = url.replace(":id", appId)

    console.log "Getting app details via url: " + url
    httpHelper.getJson(url).then (appJson) ->
      appJson.appType = LeapApp.Types.StoreApp
      cleanAppJson appJson

sendDeviceData = ->
  if uiGlobals.metricsDisabled
    console.log "Would have sent device data if metrics were enabled."
    return Q()

  dataDir = config.PlatformLeapDataDirs[os.platform()]
  unless dataDir
    console.error "Leap Motion data dir unknown for operating system: " + os.platform()
    return Q.reject new Error "Leap Motion data dir unknown for operating system: " + os.platform()

  authDataFile = path.join(dataDir, "lastauth")

  if not fs.existsSync authDataFile
    console.warn "Auth data file doesn't exist"
    if uiGlobals.embeddedDevice
      throw new Error "Auth data file doesn't exist"
    else
      return Q()

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
        console.error "Failed to send device data: " + (reason?.stack or reason)
        throw reason
    , (reason) ->
      console.warn "Failed to get an access token: " + (reason?.stack or reason)
      throw reason
  , (reason) ->
    console.warn "Error reading auth data file."
    throw reason


sendAppVersionData = ->
  if uiGlobals.metricsDisabled
    console.log "Would have sent app version data if metrics were enabled"
    return Q()

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
  console.log 'Installing', manifest.length, 'prebundled apps'

  installationFunctions = []
  manifest.forEach (appJson) ->
    appJson = cleanAppJson appJson
    appJson.noAutoInstall = true
    appJson.platform = 'win32'
    appJson.appType = LeapApp.Types.StoreApp

    app = handleAppJson appJson
    unless app?
      console.warn 'Skipping invalid prebundled app json', appJson
      return

    app.set "state", LeapApp.States.Waiting
    installationFunctions.push (callback) ->
      console.log "Installing prebundled app: " + app.get "name"
      app.install (err) ->
        if err?
          console.error "Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + (err?.stack or err)

          subscribeToAppChannel app.get("appId")
        callback null

  async.parallelLimit installationFunctions, 1, (err) ->
    installManager.showAppropriateDownloadControl()
    cb?(err)


module.exports.hydrateCachedModels = hydrateCachedModels
module.exports.connectToStoreServer = connectToStoreServer
module.exports.getNonStoreManifest = getNonStoreManifest
module.exports.getUserInformation = getUserInformation
module.exports.getAppJson = getAppJson
module.exports.handleAppJson = handleAppJson
module.exports.syncToCollection = syncToCollection
module.exports.sendDeviceData = sendDeviceData
module.exports.sendAppVersionData = sendAppVersionData
module.exports.parsePrebundledManifest = parsePrebundledManifest

async = require("async")
domain = require("domain")
fs = require("fs-extra")
os = require("os")
path = require("path")
qs = require("querystring")
url = require("url")
config = require("../../config/config.js")
db = require("./db.js")
httpHelper = require("./http-helper.js")
installManager = require("./install-manager.js")
drm = require("./drm.js")
enumerable = require("./enumerable.js")
httpHelper = require("./http-helper.js")
oauth = require("./oauth.js")
pubnub = require("./pubnub.js")
semver = require("./semver.js")
LeapApp = require("../models/leap-app.js")
WebLinkApp = require("../models/web-link-app.js")


NodePlatformToServerPlatform =
  darwin: "osx"
  win32: "windows"

ServerPlatformToNodePlatform = {}
Object.keys(NodePlatformToServerPlatform).forEach (key) ->
  ServerPlatformToNodePlatform[NodePlatformToServerPlatform[key]] = key

appsAdded = 0

cleanUpAppJson = (appJson) ->
  appJson = appJson or {}
  releaseDate = appJson.certified_at or appJson.created_at
  cleanAppJson =
    id: appJson.app_id
    appId: appJson.app_id
    versionId: appJson.id
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

  Object.keys(cleanAppJson).forEach (key) ->
    delete cleanAppJson[key]  unless cleanAppJson[key]

  cleanAppJson

createAppModel = (appJson) ->
  cleanAppJson = cleanUpAppJson(appJson)
  if cleanAppJson.platform is os.platform()
    StoreLeapApp = require("../models/store-leap-app.js")
    newApp = new StoreLeapApp(cleanAppJson)
    newApp.set "firstSeenAt", (new Date()).getTime()
    newApp
  else
    null

handleAppJson = (appJson) ->
  app = createAppModel(appJson)
  if app
    myApps = uiGlobals.myApps
    uninstalledApps = uiGlobals.uninstalledApps
    existingApp = myApps.get(app.get("appId")) or uninstalledApps.get(app.get("appId"))
    if existingApp
      if existingApp.isInstallable()
        getAppDetails app, ->
          appJson = app.toJSON()
          delete appJson.state
          existingApp.set appJson
      else if app.get("versionId") > existingApp.get("versionId")
        console.log "Upgrade available for " + app.get("name") + ". New version: " + app.get("version")
        existingApp.set "availableUpdate", app
        getAppDetails app
      else
        setTimeout ->
          getAppDetails app, ->
            appJson = do app.toJSON
            delete appJson.state

            existingApp.set appJson

        , _.random(5, 10) # Random delay to update details for already installed apps
    else
      if appsAdded >= 40
        # workaround for v8 memory limit. If a user were to purchase so many apps, then
        # switch to a second computer, must restart Airspace Home to obtain remaining apps
        console.error "Downloaded metadata for too many apps. Please restart Airspace Home to see your remaining purchases."
        return
      try
        myApps.add app
        appsAdded += 1

        getAppDetails app
      catch err
        console.error "Corrupt app data from api: " + appJson + "\n" + (err.stack or err)
  app

handleNotification = (notificationJson) ->
  console.log "got notification", notificationJson

subscribeToUserNotifications = (userId) ->
  pubnub.history 10, "notification", ->
    handleNotification.apply this, arguments

  pubnub.history 10, "notification", ->
    handleNotification.apply this, arguments

subscribeToUserChannel = (userId) ->
  pubnub.subscribe userId + ".user.purchased", ->

    # steal focus
    nwGui.Window.get().focus()
    handleAppJson.apply this, arguments

subscribeToAppChannel = (appId) ->
  pubnub.subscribe appId + ".app.updated", (appJson) ->
    handleAppJson appJson
    installManager.showAppropriateDownloadControl()

reconnectionTimeoutId = undefined
reconnectAfterError = (err) ->
  console.log "Failed to connect to store server (retrying in " + config.ServerConnectRetryMs + "ms):", (if err and err.stack then err.stack else err)
  unless reconnectionTimeoutId
    reconnectionTimeoutId = setTimeout(->
      connectToStoreServer()
    , config.ServerConnectRetryMs)

_getStoreManifest = (cb) ->
  reconnectionTimeoutId = null

  oauth.getAccessToken (err, accessToken) ->
    if err
      reconnectAfterError err
    else
      platform = NodePlatformToServerPlatform[os.platform()] or os.platform()
      apiEndpoint = config.AppListingEndpoint + "?" + qs.stringify(
        access_token: accessToken
        platform: platform
      )
      httpHelper.getJson apiEndpoint, (err, messages) ->
        if err
          reconnectAfterError err
        else if messages.errors
          reconnectAfterError new Error(messages.errors)
        else
          cb messages

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
    cb and cb(null)

connectToStoreServer = ->
  _getStoreManifest (messages) ->
    console.log "Connected to store server. Got messages: ", JSON.stringify(messages)
    $("body").removeClass "loading"
    messages.forEach (message) ->
      drm.writeXml message.auth_id, message.secret_token  if message.auth_id and message.secret_token
      if message.user_id
        _setGlobalUserInformation message
      else
        app = handleAppJson(message)
        subscribeToAppChannel app.get("appId")  if app

    do installManager.showAppropriateDownloadControl

appDetailsQueue = []
getAppDetailsForNextInQueue = ->
  queuedData = appDetailsQueue.shift()
  getAppDetails queuedData.app, queuedData.cb  if queuedData

getAppDetails = (app, cb) ->
  if appDetailsQueue.length > 0
    appDetailsQueue.push
      app: app
      cb: cb
  else
    appId = app.get("appId")
    platform = NodePlatformToServerPlatform[os.platform()]
    if appId and platform
      oauth.getAccessToken (err, accessToken) ->
        if err
          cb and cb(err)
          return do getAppDetailsForNextInQueue
        url = config.AppDetailsEndpoint
        url = url.replace(":id", appId)
        url = url.replace(":platform", platform)
        url += "?access_token=" + accessToken
        console.log "Getting app details via url: " + url
        httpHelper.getJson url, (err, appDetails) ->
          if err
            cb and cb(err)
          else
            app.set cleanUpAppJson(appDetails and appDetails.app_version)
            app.set "gotDetails", true
            app.save()
            cb and cb(null)
          cb = null
          do getAppDetailsForNextInQueue
    else
      cb and cb(new Error("appId and platform must be valid"))
      do getAppDetailsForNextInQueue

createWebLinkApps = (webAppData) ->
  webAppData = webAppData or []
  existingWebAppsById = {}

  uiGlobals.myApps.forEach (app) ->
    existingWebAppsById[app.get("id")] = app  if app.isWebLinkApp()

  webAppData.forEach (webAppDatum) ->
    webApp = new WebLinkApp(webAppDatum)
    id = webApp.get("id")
    existingWebApp = existingWebAppsById[id]
    if existingWebApp
      existingWebApp.set webAppDatum
      console.log "Updating existing web link: " + existingWebApp.get("name")
      delete existingWebAppsById[id]
      do existingWebApp.save
    else
      try
        uiGlobals.myApps.add webApp
      catch err
        console.error "Corrupt webApp: " + webApp + "\n" + (err.stack or err)
      console.log "Added web link: ", webApp.get("urlToLaunch")
      do webApp.save

  Object.keys(existingWebAppsById).forEach (id) ->
    oldWebApp = existingWebAppsById[id]
    if oldWebApp.isBuiltinTile()
      console.log "Deleting old builtin web link: " + oldWebApp.get("name")
      uiGlobals.myApps.remove oldWebApp
      do oldWebApp.save

getLocalAppManifest = (cb) ->
  httpHelper.getJson config.NonStoreAppManifestUrl, (err, manifest) ->
    if err
      console.warn "Failed to get app manifest (retrying): " + err and err.stack
      setTimeout (->
        getLocalAppManifest cb
      ), config.S3ConnectRetryMs
    else
      createWebLinkApps manifest.web
      platformApps = manifest[NodePlatformToServerPlatform[os.platform()]] or []
      cb and cb(platformApps)

sendDeviceData = (cb) ->
  dataDir = config.PlatformLeapDataDirs[os.platform()]
  unless dataDir
    console.error "Leap Motion data dir unknown for operating system: " + os.platform()
    return cb and cb(new Error("Leap Motion data dir unknown for operating system: " + os.platform()))

  authDataFile = path.join(dataDir, "lastauth")

  fs.readFile authDataFile, "utf-8", (err, authData) ->
    if err
      console.warn "Error reading auth data file."
      return cb and cb(null)

    unless authData
      console.warn "Auth data file is empty."
      return cb and cb(null)

    oauth.getAccessToken (err, accessToken) ->
      if err
        console.warn "Failed to get an access token: " + (err.stack or err)
        return cb and cb(null)

      httpHelper.post config.DeviceDataEndpoint,
        access_token: accessToken
        data: authData
      , (err) ->
        if err
          console.error "Failed to send device data: " + (err.stack or err)
          cb and cb(null)
        else
          console.log "Sent device data."
          cb and cb(null)

sendAppVersionData = (cb) ->
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

  console.log "Sending App Version Data:" + JSON.stringify(appVersionData, null, 2)

  oauth.getAccessToken (err, accessToken) ->
    if err
      console.warn "Failed to get an access token: " + (err.stack or err)
      cb and cb(err)
    else
      httpHelper.post config.AppVersionDataEndpoint,
        access_token: accessToken
        installations: JSON.stringify(appVersionData)
      , (err, res) ->
        if err
          console.error "Failed to send app version data: " + (err.stack or err)
          cb and cb(err)
        else
          console.log "Sent app version data.  Got " + res
          cb and cb(null, res)


parsePrebundledManifest = (manifest, cb) ->
  console.log "\n\n\nExamining prebundle manifest \n" + JSON.stringify(manifest or {}, null, 2)

  installationFunctions = []
  manifest.forEach (appJson) ->
    appJson.noAutoInstall = true
    unless uiGlobals.myApps.get(appJson.app_id)
      app = createAppModel(appJson)
      if app
        uiGlobals.myApps.add app
        app.set "state", LeapApp.States.Waiting
        installationFunctions.push (callback) ->
          console.log "Installing prebundled app: " + app.get("name")
          app.install (err) ->
            if err
              console.error "Unable to initialize prebundled app " + JSON.stringify(appJson) + ": " + (err.stack or err)
            else
              getAppDetails app
              subscribeToAppChannel app.get("appId")
            callback null
      else
        console.log "App model not created.  Skipping " + appJson.name

  async.parallelLimit installationFunctions, 2, (err) ->
    installManager.showAppropriateDownloadControl()
    cb and cb(err)


module.exports.connectToStoreServer = connectToStoreServer
module.exports.getUserInformation = getUserInformation
module.exports.getLocalAppManifest = getLocalAppManifest
module.exports.getAppDetails = getAppDetails
module.exports.sendDeviceData = sendDeviceData
module.exports.sendAppVersionData = sendAppVersionData
module.exports.parsePrebundledManifest = parsePrebundledManifest

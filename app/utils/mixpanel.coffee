fs = require("fs")
os = require("os")
config = require("../../config/config.js")
db = require("./db.js")
registry = require("./registry.js")

initialize = (cb) ->
  identifyIfPossible = ->
    if mixpanelDistinctId
      console.log "Using Mixpanel Distinct Id: " + mixpanelDistinctId
      db.setItem config.DbKeys.MixpanelDistinctId, mixpanelDistinctId
      window.mixpanel.identify mixpanelDistinctId
    else
      console.log "Auto-generating Mixpanel Distinct Id"
    cb?(null)

  mixpanelDistinctId = db.getItem(config.DbKeys.MixpanelDistinctId)
  if mixpanelDistinctId
    identifyIfPossible()
  else
    if os.platform() is "win32"
      registryKey = ((if process.env.ProgramW6432 then "HKLM\\Software\\Wow6432Node\\LeapMotion" else "HKLM\\Software\\LeapMotion"))
      registry.readValue registryKey, "MixPanelGUID", (err, idFromRegistry) ->
        mixpanelDistinctId = idFromRegistry  unless err
        identifyIfPossible()

    else if os.platform() is "darwin"
      fs.readFile "/Library/Application Support/Leap Motion/mpguid",
        encoding: "utf-8"
      , (err, idFromFile) ->
        mixpanelDistinctId = idFromFile  unless err
        identifyIfPossible()

    else
      identifyIfPossible()

getTrackFn = (eventName, namespace) ->
  (args) ->
    unless /^(development|test)$/.test(process.env.LEAPHOME_ENV)
      console.log "Tracking Mixpanel event: " + eventName
      namespace = namespace or uiGlobals.appName
      window.mixpanel.track namespace + " - " + eventName, _.extend(
        version: uiGlobals.appVersion
        embeddedDevice: uiGlobals.embeddedDevice
      , args)
    else
      console.log "Would have tracked Mixpanel event in a release build: " + eventName

module.exports =
  initialize: initialize
  trackOpen: getTrackFn("Launched")
  trackClose: getTrackFn("Closed Airspace")
  trackSignUp: getTrackFn("Signed Up")
  trackSignIn: getTrackFn("Signed In")
  trackAppUpgrade: getTrackFn("Started App Update")
  trackAppUninstall: getTrackFn("App Uninstalled Successfully")
  trackAppReinstall: getTrackFn("Reinstalling App")
  trackEvent: (eventName, args, namespace) ->
    (getTrackFn(eventName, namespace)) args

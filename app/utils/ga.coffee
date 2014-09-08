fs = require("fs")
os = require("os")
config = require("../../config/config.js")
db = require("./db.js")
registry = require("./registry.js")

# Google Analytics
GA_PROPERTY_ID = 'UA-31536531-9'
ua = require('universal-analytics')
visitor = null

#
# Uses old Mixpanel Distinct ID for legacy support. This ensures
# users maintain their same mixpanel distinct ID and also we do not
# require any installer changes to reset the /mpguid. We don't necessarily
# care about the name as much as we care about the distinct value for
# user tracking in Google Analytics.
#
initialize = (cb) ->
  identifyIfPossible = ->
    if mixpanelDistinctId
      console.log "Using Google Analytics Distinct Id: " + mixpanelDistinctId
      db.setItem config.DbKeys.MixpanelDistinctId, mixpanelDistinctId

    visitor = ua(GA_PROPERTY_ID, mixpanelDistinctId, {strictCidFormat: false})
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
      if !uiGlobals.metricsDisabled && visitor != null
        namespace = namespace or uiGlobals.appName
        namespace = namespace.toLowerCase().replace(' ', '_')
        eventName = eventName.toLowerCase().replace(' ', '_')
        embedded_text = if uiGlobals.embeddedDevice then '| embedded' else ''
        page_url = '/' + namespace + '/' + uiGlobals.appVersion + '/' + eventName;
        page_title = uiGlobals.appName + ' (' + uiGlobals.appVersion + ') ' + embedded_text
        visitor.pageview(page_url, page_title, page_title).send();

module.exports =
  initialize: initialize
  trackOpen: getTrackFn("launched")
  trackClose: getTrackFn("exit")
  trackSignUp: getTrackFn("signed_up")
  trackSignIn: getTrackFn("signed_in")
  trackEvent: (eventName, args, namespace) ->
    (getTrackFn(eventName, namespace)) args
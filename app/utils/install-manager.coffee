mixpanel = require("../utils/mixpanel.js")
LeapApp = require("../models/leap-app.js")

MaxConsecutiveFailures = 3
installQueue = []

enqueue = (app, cb, skipToFront) ->
  mixpanel.trackAppReinstall()  if app.get("state") is LeapApp.States.Uninstalled
  app.set "state", LeapApp.States.Waiting
  queueData =
    app: app
    cb: cb
    failureCount: 0

  if skipToFront and installQueue.length > 0
    installQueue.splice 1, 0, queueData
  else
    installQueue.push queueData

  dequeue()  if installQueue.length is 1
  showAppropriateDownloadControl()

dequeue = ->
  queuedItem = installQueue[0]
  if queuedItem
    queuedItem.app.install (err) ->
      queuedItem.failureCount++  if err and not err.cancelled
      maxFailuresExceeded = (queuedItem.failureCount >= MaxConsecutiveFailures)
      if not err or err.cancelled or maxFailuresExceeded
        if maxFailuresExceeded
          console.warn "Gave up trying to install " + queuedItem.app.get("name") + " after " + queuedItem.failureCount + " consecutive errors: " + (err and err.stack or err)
        installQueue.shift()
      queuedItem.app.off "change:state", showAppropriateDownloadControl
      showAppropriateDownloadControl()
      queuedItem.cb.apply this, arguments  if _.isFunction(queuedItem.cb)
      dequeue()

    queuedItem.app.on "change:state", showAppropriateDownloadControl

showAppropriateDownloadControl = (fade) ->
  updates = 0
  downloads = 0
  downloading = 0
  $control = undefined
  $(".download-control").hide()
  uiGlobals.myApps.forEach (app) ->
    appState = app.get("state")
    if app.isUpdatable()
      updates++
    else if appState is LeapApp.States.NotYetInstalled
      downloads++
    else downloading++  if appState is LeapApp.States.Waiting or appState is LeapApp.States.Connecting or appState is LeapApp.States.Downloading

  if installQueue.length > 0
    if downloading > 0
      if fade is true
        $("#cancel-all").fadeIn "slow"
      else
        $("#cancel-all").show()
  else if updates > 0
    $control = $("#update-all")
  else $control = $("#download-all")  if downloads > 0

  if $control
    if fade is true
      $control.fadeIn "slow"
    else
      $control.show()

cancelAll = ->
  if installQueue.length is 0
    return

  # Reset waiting apps
  while installQueue.length - 1 > 0
    console.log installQueue.length
    app = installQueue.pop().app
    if app.hasUpdate() and app.get("state") is LeapApp.States.Waiting
      app.set "state", LeapApp.States.Ready
    else
      app.set "state", LeapApp.States.NotYetInstalled

  # Cancel current download, if possible
  installQueue[0].app.trigger "cancel-download"  if installQueue.length


module.exports.enqueue = enqueue
module.exports.cancelAll = cancelAll
module.exports.showAppropriateDownloadControl = showAppropriateDownloadControl

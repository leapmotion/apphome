exec = require("child_process").exec
os = require("os")
fs = require("fs")
path = require("path")

db = require("./db.js")
config = require("../../config/config.js")
mixpanel = require("./mixpanel.js")

defer = $.Deferred()
promise = undefined

# Returns embedded type if type matches config.EmbeddedLeapTypes (e.g. pongo, hops)
# Returns undefined if no embedded device
getEmbeddedDevice = ->
  return uiGlobals.embeddedDevice  if uiGlobals.embeddedDevice in config.EmbeddedLeapTypes

  existingValue = db.fetchObj config.DbKeys.EmbeddedLeapDevice
  return existingValue  if existingValue?

  embeddedDevice = undefined

  for id, device of leapController.devices
    if device.type in config.EmbeddedLeapTypes
      embeddedDevice = device.type

  db.saveObj config.DbKeys.EmbeddedLeapDevice, embeddedDevice
  embeddedDevice

module.exports.getEmbeddedDevice = getEmbeddedDevice

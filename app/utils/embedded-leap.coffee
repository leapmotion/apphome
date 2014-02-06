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
  return uiGlobals.embeddedDevice  if _.values(config.EmbeddedLeapTypes).indexOf(uiGlobals.embeddedDevice) isnt -1

  existingValue = db.fetchObj config.DbKeys.EmbeddedLeapDevice
  return existingValue  if typeof existingValue isnt "undefined"

  embeddedDevice = undefined
  if os.platform() is "win32"
    try
      # look for the file named 'installtype' in PlatformProgramDataDir
      lastAuthPath = path.join config.PlatformLeapDataDirs[os.platform()], 'lastauth'
      unless fs.existsSync lastAuthPath
        console.log "Lastauth data not found, assuming peripheral"
      else
        lastAuthData = window.atob(fs.readFileSync lastAuthPath, 
          encoding: 'utf8'
        ).split ' '

        unless lastAuthData?.length >= 2
          console.log "Invalid lastauth data, assuming peripheral", lastAuthData
        else
          deviceType = lastAuthData[1]

          console.log "Device type: " + deviceType
          if _.has config.EmbeddedLeapTypes, deviceType
            embeddedDevice = config.EmbeddedLeapTypes[deviceType]
            mixpanel.trackEvent "Embedded Leap Motion Controller Detected",
              deviceType: embeddedDevice

    catch err
      console.error "Error reading installtype: " + err

  db.saveObj config.DbKeys.EmbeddedLeapDevice, embeddedDevice
  embeddedDevice


module.exports.getEmbeddedDevice = getEmbeddedDevice

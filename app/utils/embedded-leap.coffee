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
  return uiGlobals.embeddedDevice  if config.EmbeddedLeapTypes.indexOf(uiGlobals.embeddedDevice) isnt -1

  existingValue = db.fetchObj config.DbKeys.EmbeddedLeapDevice
  return existingValue  if typeof existingValue isnt "undefined"

  embeddedDevice = undefined
  if os.platform() is "win32"
    try
      # look for the file named 'installtype' in PlatformProgramDataDir
      dirs = config.PlatformProgramDataDirs[os.platform()]
      dirs.push "installtype"
      baseDir = path.join.apply(path, dirs)
      unless fs.existsSync baseDir
        console.log "Device type data not found, assuming peripheral"
      else
        devicetype = fs.readFileSync(baseDir).toString()
        unless devicetype
          console.error "Unable to read Device type data"
        else
          console.log "Device type: " + devicetype
          if config.EmbeddedLeapTypes.indexOf(devicetype) isnt -1
            embeddedDevice = devicetype
            mixpanel.trackEvent "Embedded Leap Motion Controller Detected",
              deviceType: embeddedDevice

    catch err
      console.error "Error reading installtype: " + err

  db.saveObj config.DbKeys.EmbeddedLeapDevice, embeddedDevice
  embeddedDevice


module.exports.getEmbeddedDevice = getEmbeddedDevice

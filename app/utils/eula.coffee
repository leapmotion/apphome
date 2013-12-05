async = require "async"
path = require "path"
os = require "os"
fs = require "fs-extra"

config = require "../../config/config.js"

sharedLeapDir = config.PlatformLeapDataDirs[os.platform()]

possibleLicenseNames = [
  /eulahash-.+\.md5/
  /license\.version/
]

possibleLastauthNames = [
  /lastauth/
]

hasBeenAgreedTo = (cb) ->
  fs.readdir sharedLeapDir, (err, files) ->
    return cb and cb(false)  if err

    foundLicense = false
    foundLastauth = false
    files.forEach (file) ->
      possibleLicenseNames.forEach (name) ->
        foundLicense = foundLicense or (file.search(name) isnt -1)
      possibleLastauthNames.forEach (name) ->
        foundLastauth = foundLastauth or (file.search(name) isnt -1)

    cb and cb(foundLicense and foundLastauth)

waitForLicense = (cb) ->
  console.log "Checking for signed EULA..."
  watch = setInterval(->
    hasBeenAgreedTo (exists) ->
      if exists
        console.log "...signed EULA found."
        clearInterval watch
        cb and cb(null)

  , 150)

module.exports.hasBeenAgreedTo = hasBeenAgreedTo
module.exports.waitForLicense = waitForLicense

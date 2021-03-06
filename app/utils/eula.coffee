async = require "async"
path = require "path"
os = require "os"
fs = require "q-io/fs"
Q = require "q"


config = require "../../config/config.js"

sharedLeapDir = config.PlatformLeapDataDirs[os.platform()]

# In addition to the license, we also look for the lastauth file.
# Lastauth contains information about the last leap device connected to the system
# It is required to give the correct entitlements to Pongo and Hops users.
# There are edge cases (around uninstalling and reinstalling on a Pongo) where a
# license file is present and a lastauth file isn't, so we have to check for both.

possibleLicenseNames = [
  /eulahash-.+\.md5/
  /license\.version/
]

possibleLastauthNames = [
  /lastauth/
]

hasBeenAgreedTo = ->
  fs.list(sharedLeapDir).then (files) ->
    foundLicense = false
    foundLastauth = false
    files.forEach (file) ->
      possibleLicenseNames.forEach (name) ->
        foundLicense = foundLicense or (file.search(name) isnt -1)
      possibleLastauthNames.forEach (name) ->
        foundLastauth = foundLastauth or (file.search(name) isnt -1)

    foundLicense and foundLastauth

waitForLicense = ->
  deferred = Q.defer()

  console.log "Checking for signed EULA..."
  watch = setInterval ->
    hasBeenAgreedTo().then (exists) ->
      if exists
        console.log "...signed EULA found."
        clearInterval watch
        deferred.resolve true
    , (reason) ->
      deferred.reject(reason)
  , 150

  return deferred.promise

module.exports.hasBeenAgreedTo = hasBeenAgreedTo
module.exports.waitForLicense = waitForLicense

fs = require("fs-extra")
os = require("os")
path = require("path")
api = require("./api.js")
config = require("../../config/config.js")
db = require("./db.js")
extract = require("./extract.js")

Q = require('q');

_manifestPromise = undefined
prebundledManifestPromise = ->
  return _manifestPromise  if _manifestPromise
  deferred = Q.defer()
  _manifestPromise = deferred.promise

  originalManifest = db.getItem(config.DbKeys.OriginalPrebundlingManifest)
  if originalManifest
    deferred.resolve JSON.parse originalManifest
  else
    _getFrozenApps (err, manifest) ->
      console.log "Unzipped", manifest.length, 'frozen apps'
      if err
        deferred.reject err
      else
        deferred.resolve manifest

  _manifestPromise

_getFrozenApps = (cb) ->
  if db.getItem(config.PrebundlingComplete)
    console.log "Prebundled apps already extracted."
    return cb("Prebundled apps already extracted")

  console.log "Expanding prebundled apps"

  freezeDriedBundlePath = _(config.FrozenAppPaths).find((bundlePath) ->
    try
      console.log "Looking for prebundled path in: " + bundlePath
      return fs.existsSync(bundlePath)
    catch err
      console.log "Prebundle path does not exist: " + bundlePath
      return false
  )

  if freezeDriedBundlePath
    console.log "\n\n\nFound freeze-dried preBundle: " + freezeDriedBundlePath
    _expandFreezeDriedApps freezeDriedBundlePath, (err, manifest) ->
      if err
        console.error "Failed to expand prebundle. " + (err.stack or err)
        cb?(new Error("Failed to expand prebundle."))
      else if manifest
        try
          db.setItem config.PrebundlingComplete, true
          cb?(null, manifest)
        catch installErr
          console.error "Failed to initialize prebundled apps. " + (installErr.stack or installErr)
          cb?(new Error("Failed to initialize prebundled apps."))
      else
        console.error "Found prebundle but manifest is missing."
        cb?(new Error("Found prebundle but manifest is missing."))
  else
    console.log "No prebundle on this system."
    cb?(new Error("No prebundle on this system."))

_expandFreezeDriedApps = (bundlePath, cb) ->
  dest = path.join(config.PlatformTempDirs[os.platform()], "frozen")
  manifest = undefined

  extract.unzipFile bundlePath, dest, true, (err) ->
    if err
      console.error "Failed to unzip " + bundlePath + ": " + (err.stack or err)
      cb?(err)
    else
      console.info "Unzipped prebundled apps at " + bundlePath + " to " + dest
      try
        console.log "Looking for prebundle manifest at " + path.join(dest, "myapps.json")
        manifest = JSON.parse(fs.readFileSync(path.join(dest, "myapps.json"),
          encoding: "utf8"
        ))
        if manifest
          console.log "Caching prebundled manifest of", manifest.length, "apps"
          #May need this to fix a bug (server does not know of entitlement for prebundled app. Lets you upgrade but does not let you run it.)
          db.setItem config.DbKeys.OriginalPrebundlingManifest, JSON.stringify(manifest)
          cb?(null, manifest)
        else
          cb?(new Error("No freeze dried apps manifest found."))
      catch err
        console.error "Corrupt myapps.json prebundled manifest: " + (err.stack or err)
        cb?(err)

module.exports.prebundledManifestPromise = prebundledManifestPromise

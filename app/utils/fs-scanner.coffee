async = require("async")
crypto = require("crypto")
exec = require("child_process").exec
fs = require("fs")
os = require("os")
path = require("path")
plist = require("./plist.js")
registry = require("./registry.js")
semver = require("./semver.js")
shell = require("./shell.js")

FsScanner = (allowedApps) ->
  if Array.isArray(allowedApps)
    @_allowedApps = {}
    allowedApps.forEach (allowedApp) =>
      @_allowedApps[allowedApp.name.toLowerCase()] = allowedApp  if allowedApp.findByScanning

FsScanner:: =
  scan: (cb) ->
    platform = os.platform()

    cleanData = (err, apps) ->
      cb?(err)  if err
      apps = _.uniq(_(apps).compact(), (app) ->
        app.get "id"
      )
      cb?(null, apps)

    try
      if platform is "win32"
        @_scanForWindowsApps cleanData
      else if platform is "darwin"
        @_scanForMacApps cleanData
      else
        cb?(new Error("Unknown system platform: " + platform))
    catch err
      cb?(err)

  _scanForMacApps: (cb) ->
    userAppsDir = path.join(process.env.HOME or "", "Applications")
    fs.mkdirSync userAppsDir  unless fs.existsSync(userAppsDir)
    # remove empty last path
    exec "find ~/Applications /Applications -maxdepth 4 -name Info.plist", (err, stdout) =>
      return cb?(err)  if err
      plistPaths = stdout.toString().split("\n")
      do plistPaths.pop
      async.mapLimit plistPaths, 1, @_createLeapAppFromPlistPath.bind(this), (err, leapApps) ->
        return cb(err)  if err
        cb?(null, leapApps)

  _createLeapAppFromPlistPath: (plistPath, cb) ->
    plist.parseFile plistPath, (err, parsedPlist) =>
      return cb(err)  if err

      keyFile = path.dirname(path.dirname(plistPath))

      attributes =
        name: parsedPlist.CFBundleDisplayName or parsedPlist.CFBundleName or parsedPlist.CFBundleExecutable
        version: parsedPlist.CFBundleShortVersionString or parsedPlist.CFBundleVersion
        keyFile: keyFile

      icon = parsedPlist.CFBundleIcon or parsedPlist.CFBundleIconFile
      if icon
        icon = icon + ".icns"  unless path.extname(icon)
        attributes.rawIconFile = path.join(keyFile, "Contents", "Resources", icon)

      cb?(null, @_createLocalLeapApp(attributes))

  _scanForWindowsApps: (cb) ->
    registryQueries = [
      (cb) -> # system-wide apps for system architecture
        registry.readFullKey "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall", cb
      (cb) -> # user apps (32- and 64-bit)
        registry.readFullKey "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall", cb
    ]

    if process.env.ProgramW6432 # running on 64-bit Windows
      registryQueries.push (cb) -> # system-wide 32-bit apps on 64-bit Windows
        registry.readFullKey "HKLM\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall", cb

    async.parallel registryQueries, (err, stdouts) =>
      return cb(err)  if err
      registryChunks = _.invoke(stdouts, "toString").join("\n").split(/^HKEY_LOCAL_MACHINE|^HKEY_CURRENT_USER/m)
      registryChunks.shift() # remove empty first chunk
      async.map registryChunks, @_createLeapAppFromRegistryChunk.bind(this), (err, leapApps) ->
        return cb?(err)  if err
        cb?(null, leapApps)

  _createLeapAppFromRegistryChunk: (registryChunk, cb) ->
    extractValueForKey = (key, type) ->
      type = type or "REG_SZ"
      regex = new RegExp(key + " +" + type + " +([^\\n]+)")
      match = registryChunk.match(regex)
      firstGroup = (match and match[1]) or ""
      firstGroup.replace /^\s+|\s+$/g, ""

    attributes =
      name: extractValueForKey("DisplayName")
      version: extractValueForKey("DisplayVersion")
      keyFile: extractValueForKey("InstallLocation")

    allowedApp = @_getAllowedApp(attributes.name)
    if allowedApp and allowedApp.relativeExePath
      attributes.relativeExePath = allowedApp.relativeExePath
      attributes.rawIconFile = path.join(attributes.keyFile, attributes.relativeExePath)

    cb?(null, @_createLocalLeapApp(attributes))

  _createLocalLeapApp: (attributes) ->
    return null  if not attributes.keyFile or not attributes.name or not attributes.version or not @_isAllowedApp(attributes.name, attributes.version)

    attributes.deletable = true  if attributes.deletable isnt false

    attributes.findByScanning = true

    LocalLeapApp = require("../models/local-leap-app.js")
    localLeapApp = new LocalLeapApp(attributes)
    (if localLeapApp.isValid() then localLeapApp else null)

  _getAllowedApp: (appName) ->
    @_allowedApps and @_allowedApps[appName.toLowerCase()]

  _isAllowedApp: (appName, appVersion) ->
    unless appName
      false
    else unless @_allowedApps
      true
    else
      allowedApp = @_getAllowedApp(appName)
      if allowedApp
        (if allowedApp.minVersion then (semver.isFirstGreaterThanSecond(appVersion, allowedApp.minVersion) or semver.areEqual(appVersion, allowedApp.minVersion)) else true)
      else
        false

module.exports = FsScanner

AdmZip = require("adm-zip")
async = require("async")
exec = require("child_process").exec
fs = require("fs-extra")
os = require("os")
mv = require("mv")
path = require("path")
plist = require("plist")
unzip = require("unzip")
shell = require("./shell.js")

IgnoredWindowsFileRegex = /^\.|^__macosx$/i
MaxChildProcessBufferSize = 1024 * 1024 * 5 # 5 MB

unzipViaNodeUnzip = (src, dest, cb) ->
  inputStream = fs.createReadStream(src)
  outputStream = unzip.Extract(path: dest)

  inputStream.on "error", (err) ->
    cb?(err)
    cb = null

  outputStream.on "close", ->
    cb?(null)
    cb = null

  outputStream.on "error", (err) ->
    cb?(err)
    cb = null

  console.log "Unzipping " + src + " to " + dest + " with node-unzip."
  inputStream.pipe outputStream

unzipViaAdmZip = (src, dest, cb) ->
  try
    zip = new AdmZip(src)
    console.log "Unzipping " + src + " to " + dest + " with AdmZip."
    zip.extractAllTo dest, true
    cb?(null)
  catch err
    cb?(err)

unzipViaShell = (src, dest, cb) ->
  command = undefined
  if os.platform() is "win32"
    command = shell.escape(path.join(__dirname, "..", "..", "bin", "unzip.exe")) + " -o " + shell.escape(src) + " -d " + shell.escape(dest)
  else
    command = "unzip -o " + shell.escape(src) + " -d " + shell.escape(dest)
  console.log "Unzipping with command: " + command
  exec command,
    maxBuffer: MaxChildProcessBufferSize
  , cb

unzipFile = (src, dest, shellUnzipOnly, cb) ->
  console.log "Unzipping " + src
  unzipViaShell src, dest, (err) ->
    if err and not shellUnzipOnly
      stats = fs.statSync(src)


      if os.platform() is "win32" and
        (stats.size > 290000000 or  # 600 MB and larger apps require chunking, but Debris at 276.5 MB to use adm-zip
         stats.size is 11247281 or  # special-case GecoMIDI 1.0.9 where otherwise adm-zip corrupts Leapd.dll
         path.basename(dest).match(/JungleJumper/)) # special-case JungleJumper 1.0.xHP.zip avoid crash in adm-zip
        unzipViaNodeUnzip src, dest, cb
      else
        unzipViaAdmZip src, dest, cb
    else
      cb?(err)

chmodRecursiveSync = (file) ->
  fs.chmodSync file, 777 # make sure file has write permissions
  if fs.statSync(file).isDirectory()
    fs.readdirSync(file).forEach (subFile) ->
      chmodRecursiveSync path.join(file, subFile)

extractAppZip = (src, dest, shellUnzipOnly, cb) ->
  return cb?(new Error("Zip archive does not exist: " + src))  unless fs.existsSync(src)

  try
    fs.removeSync dest  if fs.existsSync(dest)
    fs.mkdirpSync dest
  catch err
    console.warn "Error deleting directory \"" + dest + "\": " + (err.stack or err)
    return cb?(err)

  unzipFile src, dest, shellUnzipOnly, (err) ->
    console.log "unzipping " + src

    return cb?(err)  if err

    if os.platform() is "win32"
      try
        extractedFiles = fs.readdirSync(dest)
        possibleAppDirs = []
        extractedFiles.forEach (extractedFile) ->
          possibleAppDirs.push extractedFile  unless IgnoredWindowsFileRegex.test(extractedFile)

        console.log "found possible app dirs: " + JSON.stringify(possibleAppDirs)
        if possibleAppDirs.length is 1 and fs.statSync(path.join(dest, possibleAppDirs[0])).isDirectory()
          # application has a single top-level directory, so pull the contents out of that
          topLevelDir = path.join(dest, possibleAppDirs[0])
          console.log "Moving " + topLevelDir + " to " + dest
          chmodRecursiveSync topLevelDir
          moves = []
          fs.readdirSync(topLevelDir).forEach (appFile) ->
            moves.push (cb) ->
              mv path.join(topLevelDir, appFile), path.join(dest, appFile),
                mkdirp: true
              , cb

          async.series moves, cb
        else
          cb?(null)
      catch err
        cb?(err)
    else
      cb?(null)

extractAppDmg = (src, dest, cb) ->
  return cb?(new Error("Disk image does not exist: " + src))  unless fs.existsSync(src)

  return cb?(new Error("Extracting DMG is only supported on Mac OS X."))  if os.platform() isnt "darwin"

  exec "hdiutil mount -nobrowse " + shell.escape(src) + " -plist", (err, stdout) ->
    unmount = (callback) ->
      console.log "Unmounting and ejecting dmg at " + mountPoint
      exec "diskutil eject " + shell.escape(mountPoint), callback
    return cb?(err)  if err

    mountPoint = undefined

    try
      parsedOutput = plist.parseStringSync(stdout.toString())
      systemEntities = parsedOutput["system-entities"]
      for systemEntity in systemEntities
        if systemEntity["mount-point"]
          mountPoint = systemEntity["mount-point"]
          break
    catch err2
      return cb?(err2)
    return cb?(new Error("Mounting disk image failed."))  unless mountPoint

    try
      dirEntries = fs.readdirSync(mountPoint)
    catch readErr
      console.error "Failed to read mount point"
      return cb?(readErr)

    appPackage = undefined
    for entry in dirEntries
      dirEntry = path.join(mountPoint, entry)
      try
        isValidDir = /\.app$/i.test(dirEntry) and fs.statSync(dirEntry).isDirectory()
      catch dirErr
        isValidDir = false

      if isValidDir
        if appPackage
          unmount ->
            cb?(new Error("Multiple .app directories encountered in DMG: " + appPackage + ", " + dirEntry))

        else
          appPackage = dirEntry

    unless appPackage
      unmount ->
        cb new Error("No .app directory found in DMG.")
    else
      try
        if fs.existsSync(dest)
          chmodRecursiveSync dest
          fs.removeSync dest
      catch err2
        return unmount(->
          cb?(err2)
        )

      try
        fs.mkdirpSync path.dirname(dest)
      catch mkdirErr
        return cb?(mkdirErr)

      console.log "Installing app from " + appPackage + " to " + dest

      exec "cp -r " + shell.escape(appPackage) + " " + shell.escape(dest), (err) ->
        if err
          unmount (err2) ->
            cb?(err or err2 or null)
        else
          exec "xattr -rd com.apple.quarantine " + shell.escape(dest), (err3) ->
            console.warn "xattr exec error, ignoring: " + err3  if err3
            unmount cb


module.exports.unzip = unzipFile
module.exports.unzipApp = extractAppZip
module.exports.undmgApp = extractAppDmg
module.exports.chmodRecursiveSync = chmodRecursiveSync

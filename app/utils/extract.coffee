async = require("async")
exec = require("child_process").exec
fs = require("fs-extra")
os = require("os")
mv = require("mv")
path = require("path")
plist = require("plist")
shell = require("./shell.js")

Q = require("q")

IgnoredWindowsFileRegex = /^\.|^__macosx$/i
MaxChildProcessBufferSize = 1024 * 1024 * 5 # 5 MB

_unzipViaShell = (src, dest, cb) ->
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
  _unzipViaShell src, dest, (err) ->
    if err
      console.warn "Unzipping", src, "failed, retrying in 50ms"
      setTimeout ->
        unzipFile src, dest, shellUnzipOnly, cb
      , 50
    else
      cb?(err)

chmodRecursiveSync = (file) ->
  try
    fs.chmodSync file, '777' # make sure file has write permissions
  catch error
    console.warn error
    return

  if fs.statSync(file).isDirectory()
    fs.readdirSync(file).forEach (subFile) ->
      chmodRecursiveSync path.join(file, subFile)

_extractAppZip = (src, dest, shellUnzipOnly, cb) ->
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

          failures = 0
          async.eachSeries moves, (move, cb) ->
            move (err) ->
              unless err
                return cb null

              if failures < 3
                moves.push (cb) ->
                  setTimeout ->
                    move cb
                  , 1000

                failures++
                cb null
              else
                cb err
          , cb
        else
          cb?(null)
      catch err
        cb?(err)
    else
      cb?(null)

_extractAppDmg = (src, dest, cb) ->
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

extractApp = (src, dest, shellUnzipOnly) ->
  if os.platform() is 'win32'
    Q.nfcall _extractAppZip, src, dest, shellUnzipOnly
  else if os.platform() is 'darwin'
    Q.nfcall _extractAppDmg, src, dest
  else
    Q.fail new Error "Don't know how to install apps on platform: " + os.platform()


module.exports.unzipFile = unzipFile
module.exports.extractApp = extractApp
module.exports.chmodRecursiveSync = chmodRecursiveSync

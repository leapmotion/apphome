db = require("./db.js")
path = require("path")
os = require("os")
fs = require("fs-extra")

config = require("../../config/config.js")

newTempFilePath = (extension) ->
  # TODO: put all files in LM_Airspace subdir. (what the uninstaller looks for.)
  # todo: create LM_Airspace if doesn't already exist
  extension = extension or ""
  throw new Error("Unknown operating system: " + os.platform())  unless config.PlatformTempDirs[os.platform()]
  tempDir = config.PlatformTempDirs[os.platform()]
  filename = [
    "Airspace"
    (new Date()).getTime()
    Math.random()
  ].join("_") + "." + extension.replace(/^\./, "")
  res = path.join(tempDir, filename)
  _trackFile res
  res

newTempPlatformArchive = ->
  newTempFilePath (if os.platform() is "darwin" then "dmg" else "zip")

_workingSet = ->
  db.fetchObj(config.DbKeys.ActiveTempFilesKey) or {}

_deletionSet = ->
  db.fetchObj(config.DbKeys.TempFilesNeedingDeletionKey) or {}

_trackFile = (filePath) ->
  return  unless filePath

  all = _workingSet()
  all[filePath] = true
  db.saveObj config.DbKeys.ActiveTempFilesKey, all

_markAsDeleted = (filePath) ->
  return  unless filePath

  all = _deletionSet()
  delete all[filePath]

  db.saveObj config.DbKeys.TempFilesNeedingDeletionKey, all

cleanupTempFiles = (cb) ->
  toDelete = _(_.extend({}, _workingSet(), _deletionSet())).keys()
  db.saveObj config.DbKeys.ActiveTempFilesKey, {}

  sequentialRemove = ->
    return  unless toDelete.length
    nextFile = toDelete.shift()

    fs.exists nextFile, (doesExist) ->
      if doesExist
        fs.remove nextFile, (err) ->
          console.error "Unable to delete temp file " + nextFile + ": " + (err.stack or err)  if err
          _markAsDeleted nextFile
          sequentialRemove()

      else
        _markAsDeleted nextFile
        sequentialRemove()

  #Don't want to actually clean up the files until we're idle
  setTimeout sequentialRemove, 5000
  cb and cb(null)

ensureDir = (dirpath, cb) ->
  fs.exists dirpath, (doesExist) ->
    unless doesExist
      fs.mkdirs dirpath, (mkdirErr) ->
        cb and cb(mkdirErr)
    else
      cb and cb(null)


module.exports.newTempFilePath = newTempFilePath
module.exports.newTempPlatformArchive = newTempPlatformArchive
module.exports.ensureDir = ensureDir
module.exports.cleanupTempFiles = cleanupTempFiles

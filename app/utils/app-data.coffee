fs = require("fs")
os = require("os")
path = require("path")
config = require("../../config/config.js")

appDataDir = undefined
appDataSubDirs = {}

getDir = (subdir) ->
  unless appDataDir
    throw new Error("Unknown operating system: " + os.platform())  unless config.PlatformDirs[os.platform()]
    appDataDir = path.join((config.PlatformDirs[os.platform()] or ""), "Airspace", "AppData")

  if subdir and not appDataSubDirs[subdir]
    appDataSubDirs[subdir] = path.join(appDataDir, subdir)
    fs.mkdirSync appDataSubDirs[subdir]  unless fs.existsSync(appDataSubDirs[subdir])

  if subdir then appDataSubDirs[subdir] else appDataDir

pathForFile = (subdir, filename) ->
  path.join getDir(subdir), filename

readFile = (subdir, filename) ->
  fs.readFileSync pathForFile(subdir, filename)

writeFile = (subdir, filename, data) ->
  fs.writeFileSync pathForFile(subdir, filename), data


module.exports.getDir = getDir
module.exports.pathForFile = pathForFile
module.exports.readFile = readFile
module.exports.writeFile = writeFile

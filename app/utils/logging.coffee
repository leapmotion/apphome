fs = require("fs")
path = require("path")
os = require("os")
config = require("../../config/config.js")

log = undefined

isProduction = not /^(development|test)$/.test(process.env.LEAPHOME_ENV)

unless isProduction
  log = console.log.bind(console)
else
  pathToLog = path.join config.PlatformDirs[os.platform()], 'Airspace', 'log.txt'
  saveLogIfNeeded pathToLog
  logStream = fs.createWriteStream path.join pathToLog
  log = (message) ->
    logStream.write message + "\r\n", "utf-8"

  process.on "exit", ->
    do logStream.close

saveLogIfNeeded = (pathToLog) ->
  if /^(WARN|ERROR):/g.test fs.readFileSync pathToLog
    fs.renameSync pathToLog, pathToLog + '.' + Date.now()

getLogger = (level) ->
  level = level or "log"
  ->
    sourceFile = ((new Error()).stack.split("\n")[2] or "").replace(/^\s+|\s+$/g, "")
    str = level.toUpperCase() + " (" + uiGlobals.appVersion + "): " + Array::slice.call(arguments).map((arg) ->
      try
        return (if typeof arg is "object" then JSON.stringify(arg) else String(arg))
      catch e
        return String(arg)
    ).join(" ") + " (" + sourceFile + ")"

    log str
    if isProduction and (level is "warn" or level is "error")
      window.Raven.captureMessage str,
        tags:
          appVersion: uiGlobals.appVersion
          embeddedDevice: uiGlobals.embeddedDevice

console.log = window.console.log = getLogger("log")
console.debug = window.console.debug = getLogger("debug")
console.info = window.console.info = getLogger("info")
console.warn = window.console.warn = getLogger("warn")
console.error = window.console.error = getLogger("error")

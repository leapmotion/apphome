fs = require("fs")
path = require("path")
os = require("os")
config = require("../../config/config.js")

isProduction = false #not /^(development|test)$/.test(process.env.LEAPHOME_ENV)
pathToLog = path.join config.PlatformDirs[os.platform()], 'Airspace', 'log.txt'
if (fs.existsSync pathToLog) and (/\n(WARN|ERROR)/g.test fs.readFileSync pathToLog, {encoding: 'utf8'})
  console.log "Saving previous log"
  fs.renameSync pathToLog, pathToLog + '.' + Date.now()
logStream = fs.createWriteStream path.join pathToLog

consoleLog = console.log.bind(console)
log = (message) ->
  consoleLog message
  logStream.write message + "\r\n", "utf-8"


process.on "exit", ->
  do logStream.close


getLogger = (level) ->
  level = level or "log"
  ->
    sourceFile = ((new Error()).stack.split("\n")[2] or "").replace(/^\s+|\s+$/g, "")
    str = level.toUpperCase() + " (" + Date.now() % 10000 + "): " + Array::slice.call(arguments).map((arg) ->
      try
        return (if typeof arg is "object" then JSON.stringify(arg) else String(arg))
      catch e
        return String(arg)
    ).join(" ") + " (" + sourceFile + ")"

    log str
    if isProduction and (level is "warn" or level is "error") and not uiGlobals.metricsDisabled
      window.Raven.captureMessage str,
        tags:
          appVersion: uiGlobals.appVersion
          embeddedDevice: uiGlobals.embeddedDevice

console.log = window.console.log = getLogger("log")
console.debug = window.console.debug = getLogger("debug")
console.info = window.console.info = getLogger("info")
console.warn = window.console.warn = getLogger("warn")
console.error = window.console.error = getLogger("error")

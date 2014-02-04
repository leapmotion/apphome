exec = require("child_process").exec
os = require("os")

readValue = (keyName, valueName, cb) ->
  if os.platform() is "win32"
    exec "reg query \"" + keyName + "\" /v \"" + valueName + "\"", (err, stdout) ->
      if /^ERROR:/.test(stdout)
        cb?(new Error(stdout))
      else
        lines = stdout.replace(/^\s+|\s+$/, "").split(/\r?\n/)
        resultParts = (lines[1] or "").replace(/^\s+|\s+$/, "").split(/\s+/)
        cb?(null, resultParts[2], resultParts[1])

  else
    cb?(new Error("Registry access is only supported on Windows."))

readFullKey = (keyName, cb) ->
  if os.platform() is "win32"
    exec "reg query \"" + keyName + "\" /s",
      maxBuffer: 1000 * 1024
    , cb
  else
    cb?(new Error("Registry access is only supported on Windows."))

module.exports.readValue = readValue
module.exports.readFullKey = readFullKey

os = require("os")
exec = require("child_process").exec
shell = require("./shell.js")

convertToPng = (inputIcns, outputPng, cb) ->
  size = 96 # TODO: double on retina displays

  # (determine retina display by parsing resolution output of "system_profiler SPDisplaysDataType")
  return cb(Error("icns conversion is only supported on OS X"))  if os.platform() isnt "darwin"

  exec "sips -s format png -z " + size + " " + size + " " + shell.escape(inputIcns) + " --out " + shell.escape(outputPng), cb

module.exports.convertToPng = convertToPng

os = require("os")
exec = require("child_process").exec
path = require("path")
shell = require("./shell.js")

convertToPng = (inputBinary, outputPng, cb) ->
  return cb(new Error("ico conversion is only supported on Windows"))  if os.platform() isnt "win32"

  exec shell.escape(path.join(__dirname, "..", "..", "bin", "IconExtractor.exe")) + " " + shell.escape(inputBinary) + " " + shell.escape(outputPng), cb

module.exports.convertToPng = convertToPng

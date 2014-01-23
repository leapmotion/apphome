exec = require("child_process").exec
fs = require("fs")
os = require("os")
plist = require("plist")
shell = require("./shell.js")

parseFile = (plistPath, cb) ->
  parseResult = (err, result) ->
    return cb?(err)  if err
    try
      return cb?(null, parse(result.toString()))
    catch err2
      return cb?(err2)
  if os.platform() is "darwin"
    exec "plutil -convert xml1 -o - " + shell.escape(plistPath), parseResult
  else
    fs.readFile plistPath, parseResult

parse = (rawPlist) ->
  plist.parseStringSync rawPlist

module.exports.parseFile = parseFile
module.exports.parse = parse

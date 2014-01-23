os = require("os")

escapeBash = (string) ->
  "'" + String(string).replace(/'/g, "'\"'\"'") + "'"

escapeWindows = (string) ->
  # based on http://www.robvanderwoude.com/escapechars.php
  "\"" + String(string).replace(/([\^<>\|])/g, "^$1").replace(/\%/g, "%") + "\""

module.exports.escape = ((if os.platform() is "win32" then escapeWindows else escapeBash))

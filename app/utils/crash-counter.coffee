db = require("./db.js")
config = require("../../config/config.js")

count = ->
  db.fetchObj(config.DbKeys.CrashCount) or 0
increment = ->
  db.saveObj config.DbKeys.CrashCount, count() + 1
reset = ->
  db.saveObj config.DbKeys.CrashCount, 0

module.exports.count = count
module.exports.increment = increment
module.exports.reset = reset

config = require("../../config/config.js")

dbPrefix = undefined
db = module.exports =
  saveObj: (key, value) ->
    throw new Error(key + " not in " + _(config.DbKeys).values())  if _(config.DbKeys).values().indexOf(key) is -1
    db.setItem key, JSON.stringify(value)

  fetchObj: (key) ->
    throw new Error(key + " not in " + _(config.DbKeys).values())  if _(config.DbKeys).values().indexOf(key) is -1

    val = db.getItem(key)

    return undefined  unless val

    try
      return JSON.parse(val)
    catch err
      return undefined

  getItem: (key) ->
    window.localStorage.getItem dbPrefix + key

  setItem: (key, value) ->
    window.localStorage.setItem dbPrefix + key, value

  removeItem: (key) ->
    window.localStorage.removeItem dbPrefix + key

_([
  "clear"
  "key"
  "length"
]).each (fnName) ->
  module.exports[fnName] = ->
    window.localStorage[fnName].apply null, arguments

setDbName = (dbName) ->
  dbPrefix = dbName + ":"

module.exports.setDbName = setDbName
setDbName process.env.LEAPHOME_ENV or "production"

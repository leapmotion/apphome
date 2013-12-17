db = require('./db.js')

module.exports = cache

cache.proto = cache(->
  Object.defineProperty(Function.prototype, 'cache',
    value: ->
      return cache(this)
    configurable: true
  )
)

cache (fn, dbKey) ->
  f = ->
    if f.called
      return f.value

    value = db.fetchObj(dbKey)
    if value
      f.value = value
      f.called = true
      return f.value

    f.called = true
    return f.value = fn.apply(this, arguments)

  f.called = false
  f

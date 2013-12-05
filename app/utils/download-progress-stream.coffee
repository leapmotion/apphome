events = require("events")
util = require("util")

DownloadProgressStream = ->

util.inherits DownloadProgressStream, events.EventEmitter

DownloadProgressStream::cancel = ->
  if @_canceller
    @_canceller()
    @_canceller = null
    true
  else
    false

DownloadProgressStream::setCanceller = (canceller) ->
  @_canceller = canceller

module.exports = DownloadProgressStream

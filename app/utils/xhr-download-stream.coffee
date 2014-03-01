Buffer = require("buffer").Buffer
events = require "events"
stream = require "stream"
filesize = require "filesize"
util = require "util"

Q = require "q"

getFileSize = (requestUrl) ->
  size = undefined
  xhr = new window.XMLHttpRequest()
  deferred = Q.defer()

  xhr.open "HEAD", requestUrl

  xhr.onload = (evt) ->
    size = Number @getResponseHeader 'Content-Length'

    unless size?
      deferred.reject(new Error("Could not determine filesize for URL: " + requestUrl))
    else
      console.log 'Downloading', filesize(size), 'file from', requestUrl
      deferred.resolve(size)

  xhr.onerror = (evt) ->
    deferred.reject new Error "Error determining filesize for URL: " + requestUrl

  xhr.send()
  deferred.promise

XHRDownloadStream = (targetUrl, canceller, chunkSize) ->
  stream.Readable.call this

  @_canceller = canceller
  @_canceller?.fin ->
    do @unpipe

  @_bytesSoFar = 0
  @_fileSize = 0
  @_chunkSize = chunkSize
  @_targetUrl = targetUrl
  @_done = false

  getFileSize(targetUrl).then (fileSize) =>
    @_fileSize = fileSize

  return null

util.inherits XHRDownloadStream, stream.Readable

XHRDownloadStream::_read = (size) ->
  chunkSize = @_chunkSize or size

  if @_done
    unless (@_fileSize and @_bytesSoFar isnt @_fileSize)
      return @push null
    else
      throw new Error "Expected file of size: " + filesize(@_fileSize) + " but got: " + filesize(@_bytesSoFar)

  @_downloadChunk(@_targetUrl, @_bytesSoFar, @_bytesSoFar + chunkSize).then (data) =>
    @_bytesSoFar += data?.length or 0

    if data?.length < chunkSize or (@_fileSize and @_fileSize == @_bytesSoFar)
      @_done = true

    @push data
  , undefined
  , (bytesLoadedByCurrentRequest) =>
    percentComplete = (@_bytesSoFar + bytesLoadedByCurrentRequest) / @_fileSize if @_fileSize
    @emit "progress", percentComplete
  .fail (reason) =>
    @emit "error", reason
  .done()

XHRDownloadStream::_downloadChunk = (requestUrl, start, end) ->
  xhr = new window.XMLHttpRequest()
  xhr.open "GET", requestUrl
  xhr.responseType = "arraybuffer"
  xhr.setRequestHeader "range", "bytes=" + start + "-" + end

  deferred = Q.defer()

  @_canceller?.fin ->
    do xhr.abort

  xhr.onload = ->
    if @status >= 200 and @status <= 299
      # Must use window.Uint8Array instead of the Node.js Uint8Array here because of node-webkit memory wonkiness.
      deferred.resolve new Buffer new window.Uint8Array @response
    else
      deferred.reject new Error "Got status code: " + @status + " for chunk " + start + '-' + end

    nwGui.App.clearCache()

  xhr.onprogress = (evt) ->
    if evt.lengthComputable
      deferred.notify evt.loaded

  xhr.onerror = (evt) ->
    deferred.reject new Error "Error downloading chunk " + start + '-' + end

  do xhr.send

  # Dodge memory leak?
  xhr = null

  deferred.promise

module.exports = XHRDownloadStream

Buffer = require("buffer").Buffer
events = require "events"
stream = require "stream"
filesize = require "filesize"
util = require "util"

Q = require "q"

getFileSize = (requestUrl, cb) ->
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

downloadChunk = (requestUrl, start, end) ->
  xhr = new window.XMLHttpRequest()
  xhr.open "GET", requestUrl
  xhr.responseType = "arraybuffer"
  xhr.setRequestHeader "range", "bytes=" + start + "-" + end

  deferred = Q.defer()
  deferred.promise.cancel = ->
    do xhr.abort

  xhr.onload = ->
    nwGui.App.clearCache()
    if @status >= 200 and @status <= 299
      # Must use window.Uint8Array instead of the Node.js Uint8Array here because of node-webkit memory wonkiness.
      deferred.resolve(new Buffer(new window.Uint8Array(@response)))
    else if @status == 416
      deferred.resolve(null)
    else
      deferred.reject(new Error("Got status code: " + @status + " for chunk."))

  xhr.onprogress = (evt) ->
    if evt.lengthComputable
      deferred.notify evt.loaded

  xhr.onerror = (evt) ->
    deferred.reject new Error "Error downloading chunk " + start + '-' + end

  do xhr.send

  deferred.promise

XHRDownloadStream = (targetUrl, chunkSize) ->
  stream.Readable.call this

  @_bytesSoFar = 0
  @_fileSize = 0
  @_chunkSize = chunkSize
  @_targetUrl = targetUrl

  getFileSize(targetUrl).then (fileSize) =>
    @_fileSize = fileSize

  return null

util.inherits(XHRDownloadStream, stream.Readable)

XHRDownloadStream::_read = (size) ->
  chunkSize = @_chunkSize or size
  @currentRequestPromise = downloadChunk(@_targetUrl, @_bytesSoFar, @_bytesSoFar + chunkSize)
  @currentRequestPromise.then (data) =>
    if not data? and @_bytesSoFar isnt @_fileSize
      throw new Error "Expected file of size: " + @_fileSize + " but got: " + @_bytesSoFar
    @_bytesSoFar += data?.length or 0
    @push data
  , (reason) =>
    @emit "error", reason
  , (bytesLoadedByCurrentRequest) =>
    percentComplete = (@_bytesSoFar + bytesLoadedByCurrentRequest) / @_fileSize if @_fileSize
    @emit "progress", percentComplete
  .done()

XHRDownloadStream::cancel = ->
  do @unpipe
  do @currentRequestPromise.cancel

module.exports = XHRDownloadStream

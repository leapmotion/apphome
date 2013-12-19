Buffer = require("buffer").Buffer
fs = require "fs"
http = require "http"
https = require "https"
os = require "os"
path = require "path"
qs = require "querystring"
stream = require "stream"
url = require "url"
util = require "util"
through = require "through"

Q = require "q"
qhttp = require "q-io/http"

config = require "../../config/config.js"

workingFile = require "./working-file.js"
DownloadProgressStream = require "./download-progress-stream.js"


getFileSize = (requestUrl, cb) ->
  fileSize = undefined
  xhr = new window.XMLHttpRequest()
  deferred = Q.defer()

  xhr.open "HEAD", requestUrl

  xhr.onload = (evt) ->
    fileSize = Number @getResponseHeader 'Content-Length'

    unless fileSize?
      deferred.reject(new Error("Could not determine filesize for URL: " + requestUrl))
    else
      console.log 'Downloading file of size', Math.round(fileSize / 1049000), 'MB from', requestUrl
      deferred.resolve(fileSize)

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

XhrBinaryStream = (targetUrl) ->
  stream.Readable.call this

  @bytesSoFar = 0
  @chunkSize = config.DownloadChunkSize
  @_targetUrl = targetUrl

util.inherits(XhrBinaryStream, stream.Readable)

XhrBinaryStream::_read = (size) ->
  @currentRequestPromise = downloadChunk(@_targetUrl, @bytesSoFar, @bytesSoFar + @chunkSize)
  @currentRequestPromise.then (data) =>
    @bytesSoFar += data?.length or 0
    @push data
  , (reason) =>
    @emit "error", reason
  , (bytesLoadedByCurrentRequest) =>
    @emit "progress", @bytesSoFar + bytesLoadedByCurrentRequest
  .done()

XhrBinaryStream::cancel = ->
  @currentRequestPromise.cancel()
  @cancelled = true
  @push null

getToDisk = (requestUrl, opts, cb) ->
  deferred = Q.defer()

  opts = opts or {}
  return cb(new Error("No source url specified."))  unless requestUrl

  if not cb and _.isFunction(opts)
    cb = opts
    opts = {}

  if opts.accessToken
    urlParts = url.parse(requestUrl, true)
    urlParts.query.access_token = opts.accessToken
    requestUrl = url.format(urlParts)

  destPath = opts.destPath or workingFile.newTempPlatformArchive()
  progressStream = new DownloadProgressStream()

  binaryStream = new XhrBinaryStream requestUrl
  writeStream = fs.createWriteStream destPath

  binaryStream.on 'error', (err) ->
    console.warn "Downloading chunk failed: " + (err.stack or err) + " (" + requestUrl + ")"
    deferred.reject err

  writeStream.on 'error', (err) ->
    console.warn "Writing chunk failed: " + (err.stack or err) + " (" + destPath + ")"
    deferred.reject err

  getFileSize(requestUrl).then (fileSize)->
    binaryStream.pipe writeStream

    binaryStream.on 'progress', (bytesSoFar) ->
      progressStream.emit "progress", bytesSoFar / fileSize

    binaryStream.on 'end', ->
      if @bytesSoFar isnt fileSize
        deferred.reject new Error "Expected file of size: " + fileSize + " but got: " + @bytesSoFar
      else
        deferred.resolve destPath.toString()

    deferred.promise

  # Tell the progress stream what to do when cancelling a download
  progressStream.setCanceller ->
    do binaryStream.unpipe
    do binaryStream.cancel
    do writeStream.end

    try
      fs.unlinkSync destPath  if fs.existsSync(destPath)
    catch err
      console.warn "Could not cleanup cancelled download: " + (err.stack or err)
      deferred.reject(err)

    err = new Error "Cancelled download of " + requestUrl
    err.cancelled = true
    deferred.reject err

  deferred.promise.nodeify cb

  progressStream

getJson = (requestUrl) ->
  Q(window.$.getJSON(requestUrl)).then (json) ->
    nwGui.App.clearCache()
    json

post = (requestUrl, data, cb) ->
  xhr = new window.XMLHttpRequest()
  xhr.open "POST", requestUrl
  xhr.setRequestHeader "Content-type", "application/x-www-form-urlencoded"
  xhr.onload = ->
    nwGui.App.clearCache()
    cb?(null, @responseText)
    cb = null

  xhr.onerror = (err) ->
    cb?(err)
    cb = null

  xhr.send qs.stringify(data)

module.exports.getToDisk = getToDisk
module.exports.getJson = getJson
module.exports.post = post

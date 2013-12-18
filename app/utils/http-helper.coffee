Buffer = require("buffer").Buffer
fs = require("fs")
http = require("http")
https = require("https")
os = require("os")
path = require("path")
qs = require("querystring")
url = require("url")

Q = require "q"
qhttp = require "q-io/http"

config = require("../../config/config.js")

DownloadProgressStream = require("./download-progress-stream.js")
workingFile = require("./working-file.js")
DownloadChunkSize = 1024 * 1024 * 5 # 5 MB

getFileSize = (requestUrl, cb) ->
  fileSize = undefined
  xhr = new window.XMLHttpRequest()
  xhr.open "GET", requestUrl

  xhr.onprogress = (evt) ->
    if evt.total
      @abort()
      nwGui.App.clearCache()
      fileSize = evt.total
      cb?(null, fileSize)
      cb = null

  xhr.onload = (evt) ->
    if typeof fileSize is "undefined"
      cb?(new Error("Could not determine filesize for URL: " + requestUrl))
      cb = null

  xhr.onerror = (evt) ->
    cb?(evt)
    cb = null

  xhr.send()

downloadChunk = (requestUrl, start, end, cb) ->
  xhr = new window.XMLHttpRequest()
  xhr.open "GET", requestUrl, true
  xhr.responseType = "arraybuffer"
  xhr.setRequestHeader "range", "bytes=" + start + "-" + end
  startTime = Date.now()

  xhr.onload = ->
    nwGui.App.clearCache()
    if @status >= 200 and @status <= 299
      # Must use window.Uint8Array instead of the Node.js Uint8Array here because of node-webkit memory wonkiness.
      cb?(null, new Buffer(new window.Uint8Array(@response)))
    else
      cb?(new Error("Got status code: " + @status + " for chunk."))
    cb = null

  xhr.onerror = (err) ->
    cb?(err)
    cb = null

  xhr.send()
  xhr

getToDisk = (requestUrl, opts, cb) ->
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

  fd = fs.openSync(destPath, "w")
  currentRequest = undefined
  getFileSize requestUrl, (err, fileSize) ->
    if err
      cb?(err)
    else
      numChunks = Math.ceil(fileSize / DownloadChunkSize)
      console.debug "Downloading " + fileSize + " bytes in " + numChunks + " chunks (" + requestUrl + ")"
      bytesSoFar = 0

      # Called recursively to get and write all chunks.
      downloadAllChunks = (numRemainingChunks) ->
        progressStream.emit "progress", bytesSoFar / fileSize
        if numRemainingChunks > 0
          start = (numChunks - numRemainingChunks) * DownloadChunkSize
          end = Math.min(start + DownloadChunkSize - 1, fileSize)
          currentRequest = downloadChunk requestUrl, start, end, (err, chunk) ->
            if err
              console.info "Downloading chunk failed: " + start + " - " + end + " of " + fileSize + " " + (err.stack or err) + " (" + requestUrl + ")"
              fs.close fd
              cb?(err)
              cb = null
            else
              bytesSoFar += chunk.length
              fs.write fd, chunk, 0, chunk.length, start, (err) ->
                chunk = null
                if err
                  console.info "Writing chunk failed: " + start + " - " + end + " of " + fileSize + " " + (err.stack or err) + " (" + requestUrl + ")"
                  fs.close fd
                  cb?(err)
                  cb = null
                else
                  downloadAllChunks numRemainingChunks - 1

          currentRequest.onprogress = (evt) ->
            progressStream.emit "progress", (bytesSoFar + evt.loaded) / fileSize  if evt.lengthComputable
        else
          fs.close fd, (err) ->
            if err
              cb?(err)
            else if bytesSoFar isnt fileSize
              cb?(new Error("Expected file of size: " + fileSize + " but got: " + bytesSoFar))
            else
              cb?(null, destPath)
            cb = null

      downloadAllChunks numChunks

  # Tell the progress stream what to do when cancelling a download
  progressStream.setCanceller ->
    try
      fs.closeSync fd
      fs.unlinkSync destPath  if fs.existsSync(destPath)
    catch err
      console.warn "Could not cleanup cancelled download: " + (err.stack or err)

    if currentRequest
      currentRequest.abort()
      nwGui.App.clearCache()

    err = new Error("Download cancelled.")
    err.cancelled = true
    cb?(err)
    cb = null

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

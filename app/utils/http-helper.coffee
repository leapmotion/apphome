fs = require "fs"
os = require "os"
path = require "path"
qs = require "querystring"
url = require "url"

Q = require "q"

config = require "../../config/config.js"

workingFile = require "./working-file.js"
XHRDownloadStream = require "./xhr-download-stream.js"

getToDisk = (targetUrl, opts) ->
  deferred = Q.defer()

  opts = opts or {}
  deferred.reject new Error "No source url specified." unless targetUrl

  if opts.accessToken
    urlParts = url.parse(targetUrl, true)
    urlParts.query.access_token = opts.accessToken
    targetUrl = url.format(urlParts)

  destPath = opts.destPath or workingFile.newTempPlatformArchive()

  downloadStream = new XHRDownloadStream targetUrl, config.DownloadChunkSize
  writeStream = fs.createWriteStream destPath

  downloadStream.on 'error', (err) ->
    console.warn "Downloading chunk failed: " + (err.stack or err) + " (" + targetUrl + ")"
    deferred.reject err

  writeStream.on 'error', (err) ->
    console.warn "Writing chunk failed: " + (err.stack or err) + " (" + destPath + ")"
    deferred.reject err

  downloadStream.pipe writeStream

  writeStream.on 'finish', ->
    unless downloadStream.cancelled
      deferred.resolve destPath.toString()

  downloadStream.on 'progress', (percentComplete) ->
    deferred.notify percentComplete

  deferred.promise.cancel = ->
    do downloadStream.cancel
    do writeStream.end

    try
      fs.unlinkSync destPath  if fs.existsSync(destPath)
    catch err
      console.warn "Could not cleanup cancelled download: " + (err.stack or err)
      deferred.reject err

    err = new Error "Cancelled download of " + targetUrl
    err.cancelled = true
    deferred.reject err

  deferred.promise

getJson = (targetUrl) ->
  Q(window.$.getJSON(targetUrl)).then (json) ->
    nwGui.App.clearCache()
    json

post = (targetUrl, data) ->
  deferred = Q.defer()

  xhr = new window.XMLHttpRequest()
  xhr.open "POST", targetUrl
  xhr.setRequestHeader "Content-type", "application/x-www-form-urlencoded"
  xhr.onload = ->
    nwGui.App.clearCache()
    deferred.resolve @responseText

  xhr.onerror = (err) ->
    deferred.reject err

  xhr.send qs.stringify(data)

  deferred.promise

module.exports.getToDisk = getToDisk
module.exports.getJson = getJson
module.exports.post = post

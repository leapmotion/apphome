fs = require "fs"
os = require "os"
path = require "path"
qs = require "querystring"
url = require "url"
db = require("./db")
i18n = require "./i18n"
diskspace = require('./diskspace/diskspace')

Q = require "q"

config = require "../../config/config.js"

workingFile = require "./working-file.js"
XHRDownloadStream = require "./xhr-download-stream.js"

checkPath = (pathToTest) ->
  if os.platform() == 'win32'
    pathToTest[0]
  else
    path.dirname(pathToTest)

bytesToMB = (bytecount) ->
  Math.round(bytecount/10485)/100 + " MB"

getToDisk = (targetUrl, opts) ->
  deferred = Q.defer()

  opts = opts or {}
  deferred.reject new Error "No source url specified." unless targetUrl

  if opts.accessToken
    urlParts = url.parse(targetUrl, true)
    urlParts.query.access_token = opts.accessToken
    targetUrl = url.format(urlParts)

  canceller = opts.canceller

  destPath = opts.destPath or workingFile.newTempPlatformArchive()
  finalDir = opts.finalDir

  downloadStream = new XHRDownloadStream targetUrl, canceller, config.DownloadChunkSize
  writeStream = fs.createWriteStream destPath

  # Set up error handlers
  downloadStream.on 'error', (err) ->
    console.warn "Downloading chunk failed: " + (err.stack or err) + " (" + targetUrl + ")"
    deferred.reject err

  writeStream.on 'error', (err) ->
    console.warn "Writing chunk failed: " + (err.stack or err) + " (" + destPath + ")"
    deferred.reject err

  writeStream.on 'finish', ->
    # on cancel, this gets called after deferred is rejected, so is a noop
    deferred.resolve destPath.toString()

  downloadStream.on 'progress', (percentComplete) ->
    deferred.notify percentComplete

  canceller?.fin ->
    err = new Error "Cancelled download of " + targetUrl
    err.cancelled = true
    deferred.reject err

    do writeStream?.end ->
      try
        fs.unlinkSync destPath  if fs.existsSync destPath
      catch err
        console.warn "Could not cleanup cancelled download: " + (err.stack or err)

  console.log('launching getFileSize')
  diskFullMessage = (fileSize, path, pathFree) ->
    window.alert(i18n.translate('Disk full.') + "\n" + i18n.translate('File') + ': ' + bytesToMB(fileSize) + "\n" + checkPath(path) + ": " + bytesToMB(pathFree) + "\n")

  downloadStream.getFileSize().then (fileSize) ->
    if finalDir
      # Preference is to check disk space in both temp and final drives, but bail if not possible.
      diskspace.check checkPath(destPath), (err, total, free, status) =>
        if fileSize > free
          diskFullMessage(fileSize, destPath, free)
          er = new Error(i18n.translate('Disk full.'))
          er.cancelled = true
          deferred.reject er
        else
          console.log('Need ' + (fileSize) + 'B from temp directory, got ' + free + ', good to go!')
          diskspace.check checkPath(finalDir), (err2, total2, free2, status2) =>
            # We need to check if the disks in temp and final are the same or different, and demand disk space based on that
            # The ratio 1 (package) : 2.3 (extracted package3) is the approximate ratio of the total space required.
            fileSize2 = fileSize * (if total==total2 && free == free2 then 3.3 else 2.3)
            if fileSize2 > free2
              diskFullMessage(fileSize2, finalDir, free2)
              er = new Error(i18n.translate('Disk full.'))
              er.cancelled = true
              deferred.reject er
            else
              console.log('Need ' + fileSize2 + 'B from final directory, got ' + free2 + ', good to go!')
              # Get it flowing
              downloadStream.pipe writeStream
    else
      # Just start the download if there's no final app dir.
      downloadStream.pipe writeStream
  .fail ->
    # Get it flowing
    downloadStream.pipe writeStream


  deferred.promise

getJson = (targetUrl) ->
  Q(window.$.getJSON(targetUrl)).then (json, e) ->
    console.log('getJson',targetUrl,'result',e)
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

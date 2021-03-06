fs = require "fs"
fsExtra = require "fs-extra"
os = require "os"
path = require "path"
qs = require "querystring"
url = require "url"
db = require("./db")
i18n = require "./i18n"
diskspace = require('./diskspace/diskspace')
popup = require("../views/popups/popup.js")

Q = require "q"

config = require "../../config/config.js"

workingFile = require "./working-file.js"
XHRDownloadStream = require "./xhr-download-stream.js"

checkPathEnsuringItExists = (pathToTest) ->
  if os.platform() == 'win32'
    pathToTest[0]
  else
    try
      fsExtra.mkdirpSync path.dirname(pathToTest)
    catch mkdirErr
      console.warn "Error ensuring path exists: " + (mkdirErr.stack or mkdirErr)
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
    popup.open "disk-full", { required: bytesToMB(fileSize), diskName: checkPathEnsuringItExists(path) + ':', free: bytesToMB(pathFree) }

  downloadStream.getFileSize().then (fileSize1) ->
    if finalDir
      # Preference is to check disk space in both temp and final drives, but bail if not possible.
      diskspace.check checkPathEnsuringItExists(destPath), (err1, total1, free1, status1) =>
        diskspace.check checkPathEnsuringItExists(finalDir), (err2, total2, free2, status2) =>
          # The ratio 1 (package) : X (extracted package3) is the approximate ratio of the total space required.
          fileSize2 = fileSize1 * 4
          console.log "We have #{free2} of #{fileSize2} in final directory, #{free1} of #{fileSize1} in download directory"
          if total1 is 0 and total2 is 0
            console.error err1 if err1
            console.error err2 if err2
            console.log "Invalid disk space check result, trying to install anyway..."
            downloadStream.pipe writeStream
          else if fileSize2 > free2 || fileSize1 > free1
            # Prefer to show the stricter requirement first.
            if fileSize2 > free2
              diskFullMessage(fileSize2, finalDir, free2)
            else
              diskFullMessage(fileSize1, destPath, free1)
            er = new Error(i18n.translate('Disk full.'))
            er.cancelled = true
            deferred.reject er
            require('./install-manager').cancelAll()
          else
            console.log "Need #{fileSize2}B from final directory, got #{free2}, good to go!"
            downloadStream.pipe writeStream
    else
      downloadStream.pipe writeStream
  .fail ->
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

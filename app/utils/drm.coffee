fs = require("fs-extra")
path = require("path")
os = require("os")
async = require("async")

xmlTemplate = fs.readFileSync(path.join(__dirname, "..", "..", "config", "tt.xml.template"), "utf-8")

PlatformOutputPaths =
  darwin: [
    process.env.HOME
    "Library"
    "Preferences"
    "DSS"
    "auth.plist"
  ]
  win32: [
    process.env.APPDATA
    "Leap Motion"
    "tt.xml"
  ]

_generateXml = (authId, token) ->
  xmlTemplate.replace("@AUTHID", authId).replace "@TOKEN", token

writeXml = (authId, token) ->
  unless PlatformOutputPaths[os.platform()]
    console.warn "DRM not supported for platform: " + os.platform()
    return
  outputPath = path.join.apply(null, PlatformOutputPaths[os.platform()])
  if outputPath
    ctx =
      outputPath: outputPath
      outputDir: path.dirname(outputPath)
      authId: authId
      token: token

    async.waterfall [
      (next) ->
        next null, ctx
      _ensureDirectory
      _checkContent
      _writeXmlToDisk
    ], (err, ctx) ->
      console.error "Cannot write DRM XML: " + (err.stack or err)  if err


# todo: refactor with workingFile.ensureDirectory
_ensureDirectory = (ctx, next) ->
  fs.mkdirs ctx.outputDir, (mkdirErr) ->
    next and next(mkdirErr, ctx)

_checkContent = (ctx, next) ->
  fs.exists ctx.outputPath, (doesExist) ->
    unless doesExist
      console.log "Need to create DRM file: " + ctx.outputPath
      ctx.needsWriting = true
      next and next(null, ctx)
    else
      fs.readFile ctx.outputPath, (err, data) ->
        unless err
          ctx.needsWriting = not (new RegExp(ctx.token)).test(data)
        else
          ctx.needsWriting = true
        console.log "DRM " + ((if ctx.needsWriting then "needs" else "does not need")) + " updating."
        next and next(null, ctx)


_writeXmlToDisk = (ctx, next) ->
  if ctx.needsWriting
    console.log "Writing DRM file to " + ctx.outputPath
    fs.writeFile ctx.outputPath, _generateXml(ctx.authId, ctx.token), (err) ->
      next err, ctx

  else
    next null, ctx

module.exports.writeXml = writeXml

fs = require("fs")
stylus = require("stylus")

appendScript = (src, contextDocument) ->
  $("body", contextDocument).append "<script src=\"" + src + "\"></script>"

appendStylesheet = (href, contextDocument) ->
  $("body", contextDocument).append "<link rel=\"stylesheet\" type=\"text/css\" href=\"" + href + "\"/>"

# Renders stylus file into CSS and injects it into the DOM. Ignores repeat calls for the same file.
#  @stylusPath: required. Absolute path for desired .styl file.
#  @contextDocument: optional. Document into which to insert CSS.
applyStylus = (stylusPath, contextDocument) ->
  contextDocument = contextDocument or window.document
  injectedCssFiles = contextDocument._injectedCssFiles = contextDocument._injectedCssFiles or {}
  unless injectedCssFiles[stylusPath]
    injectedCssFiles[stylusPath] = true
    stylusSrc = fs.readFileSync(stylusPath, "utf-8")
    stylus.render stylusSrc,
      filename: stylusPath
    , (err, renderedCss) ->
      if err
        throw err
      else
        $("<style/>", contextDocument).text(renderedCss).appendTo $("head", contextDocument)

module.exports.appendScript = appendScript
module.exports.appendStylesheet = appendStylesheet
module.exports.applyStylus = applyStylus

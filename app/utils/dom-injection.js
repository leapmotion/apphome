var fs = require('fs');
var stylus = require('stylus');

function appendScript(src, contextDocument) {
  $('body', contextDocument).append('<script src="' + src + '"></script>');
}

function appendStylesheet(href, contextDocument) {
  $('body', contextDocument).append('<link rel="stylesheet" type="text/css" href="' + href + '"/>');
}

// Renders stylus file into CSS and injects it into the DOM. Ignores repeat calls for the same file.
//  @stylusPath: required. Absolute path for desired .styl file.
//  @contextDocument: optional. Document into which to insert CSS.
function applyStylus(stylusPath, contextDocument) {
  contextDocument = contextDocument || window.document;
  var injectedCssFiles = contextDocument._injectedCssFiles = contextDocument._injectedCssFiles || {};
  if (!injectedCssFiles[stylusPath]) {
    injectedCssFiles[stylusPath] = true;
    var stylusSrc = fs.readFileSync(stylusPath, 'utf-8');
    stylus.render(stylusSrc, { filename: stylusPath }, function(err, renderedCss){
      if (err) {
        throw err;
      } else {
        $('<style/>', contextDocument).text(renderedCss).appendTo($('head', contextDocument));
      }
    });
  }
}

module.exports.appendScript = appendScript;
module.exports.appendStylesheet = appendStylesheet;
module.exports.applyStylus = applyStylus;

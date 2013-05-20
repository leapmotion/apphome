var stylus = require('stylus');
var fs = require('fs');


function appendScript(src) {
  $('body').append('<script src="' + src + '"></script>');
}

function appendScriptTag(href) {
  $('body').append('<link rel="stylesheet" type="text/css" href="' + href + '"/>');
}

var injectedCssFiles = {};

// Renders stylus file into css and injects it into the DOM. Ignores repeat calls for the same file.
//  @path: required. absolute path for desired .stylus file
function applyStylus(path) {
  if (!injectedCssFiles[path]) {
    injectedCssFiles[path] = true;
    var src = fs.readFileSync(path, 'utf8');
    stylus.render(src, { filename: path }, function(err, css){
      if (err) {
        throw err;
      } else {
        $('<style/>').text(css).appendTo($('head'));
      }
    });
  }
}

module.exports.appendScript = appendScript;
module.exports.appendScriptTag = appendScriptTag;
module.exports.applyStylus = applyStylus;

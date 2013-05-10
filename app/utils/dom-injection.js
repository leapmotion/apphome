function appendScript(src) {
  $('body').append('<script src="' + src + '"></script>');
}

function appendScriptTag(href) {
  $('body').append('<link rel="stylesheet" type="text/css" href="' + href + '"/>');
}

module.exports.appendScript = appendScript;
module.exports.appendScriptTag = appendScriptTag;

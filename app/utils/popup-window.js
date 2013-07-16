var singletonPopups = {};

function openPopup(htmlFile, options) {
  var popup = singletonPopups[htmlFile];
  if (!popup || options.allowMultiple) {
    popup = nwGui.Window.open(htmlFile, _.extend({
      'toolbar': false,
      'frame': true,
      'min_width': options.width,
      'min_height': options.height,
      'max_width': options.width,
      'max_height': options.height,
      'always-on-top': true,
      'icon': 'static/icon/icon.png'
    }, options));
    singletonPopups[htmlFile] = popup;

    if (!options.openLinksInternally) {
      popup.on('loaded', function() {
        var popupDocument = popup.window && popup.window.document;
        if (popupDocument) {
          $('body', popupDocument).on('click', 'a', function(evt) {
            evt.preventDefault();
            var href = $(this).attr('href');
            if (href) {
              nwGui.Shell.openExternal(href);
            }
          });
        }
      });
    }

    popup.on('close', function() {
      delete singletonPopups[htmlFile];
      popup.close(true);
    });
  } else {
    popup.show();
    popup.focus();
  }
  return popup;
}

module.exports.open = openPopup;

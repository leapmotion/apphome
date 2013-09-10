var singletonPopups = {};

function openPopup(options) {
  if (!options.name) {
    throw new Error('Required popup option: name');
  }
  var popup = singletonPopups[options.name];
  if (!popup || options.allowMultiple) {
    var popupOptions = _.extend({
      'name': name,
      'toolbar': false,
      'frame': true,
      'min_width': options.width,
      'min_height': options.height,
      'max_width': options.width,
      'max_height': options.height,
      'always-on-top': true,
      'icon': 'static/icon/icon.png',
      'show': false
    }, options);
    popup = nwGui.Window.open('static/popup.html', popupOptions);
    popup.options = popupOptions;
    singletonPopups[name] = popup;

    if (!options.openLinksInternally) {
      popup.on('loaded', function() {
        popup.show();
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
      delete singletonPopups[name];
      popup.close(true);
    });
  } else {
    popup.show();
    popup.focus();
  }
  return popup;
}

module.exports.open = openPopup;

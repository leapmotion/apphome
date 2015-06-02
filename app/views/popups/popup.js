var singletonPopups = {};

function openPopup(popupName, options) {
  if (!popupName) {
    throw new Error('Required arg: popupName');
  }
  var PopupView = require('./' + popupName + '/' + popupName + '.js');
  options = _.extend({}, PopupView.prototype.options, options);
  var popup = singletonPopups[popupName];
  if (!popup || options.allowMultiple) {
    var popupOptions = _.extend({
      name: popupName,
      toolbar: false,
      frame: true,
      resizable: false,
      icon: 'static/icon/icon.png'
    }, options);
    popup = nwGui.Window.open('./app/views/popups/popup.html', popupOptions);
    popup.options = popupOptions;
    singletonPopups[popupName] = popup;

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

    popup.on('close', function() {
      delete singletonPopups[popupName];
      if (popup) {
        popup.close(true);
        popup = null;
      }
    });
  } else {
    popup.on('loaded', function() {
      popup.focus();
    });
  }
  return popup;
}

module.exports.open = openPopup;

var os = require('os');

var api = require('../../utils/api.js');
var i18n = require('../../utils/i18n.js');
var installManager = require('../../utils/install-manager.js');

var Modal = require('../modal/modal.js');
var TrashTileView = require('../trash-tile/trash-tile.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'trash-modal',

  initialize: function() {
    this.initializeModal();

    this.$el.append(this.templateHtml({
      trash_label:        i18n.translate('Trash'),
      cancel_label:       i18n.translate('Cancel'),
      reinstallAll_label: i18n.translate('Reinstall All')
    }));

    var uninstalledApps = uiGlobals.uninstalledApps;

    if (uninstalledApps.length > 2) {
      this.$('.content').addClass('scroll');
    }

    uninstalledApps.forEach((function(app) {
      var view = new TrashTileView({
        leapApp: app,
        onReinstall: (function() {
          this.remove();
          uiGlobals.uninstalledApps.remove(app);

          // Need this to reset the binaryUrl
          api.getAppDetails(app, function() {
            uiGlobals.myApps.add(app);
            installManager.enqueue(app);
          });

          this.options.onClose(true);
        }).bind(this)
      });
      this.$('.content').append(view.$el);
    }).bind(this));

    this.$('.button.reinstall-all').click((function() {
      while(uiGlobals.uninstalledApps.length) {
        var app = uiGlobals.uninstalledApps.shift();
        uiGlobals.myApps.add(app);
        installManager.enqueue(app);
      }

      this.options.onClose(true);
      this.remove();
    }).bind(this));
  }

});

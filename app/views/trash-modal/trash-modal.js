var Modal = require('../modal/modal.js');
var TrashTileView = require('../trash-tile/trash-tile.js');

var installManager = require('../../utils/install-manager.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'trash-modal',

  initialize: function() {
    this.initializeModal();

    this.$el.append($(this.templateHtml()));

    var uninstalledApps = uiGlobals.uninstalledApps;

    uninstalledApps.forEach((function(app) {
      var view = new TrashTileView({
        leapApp: app,
        onReinstall: (function() {
          this.remove();
          uiGlobals.uninstalledApps.remove(app);
          uiGlobals.myApps.add(app);
          installManager.enqueue(app);
          this.options.onClose(true);
        }).bind(this)
      });
      this.$('.content').append(view.$el);
    }).bind(this));

    this.$('.button.reinstall-all').click((function() {
      function reinstall(app) {
        uiGlobals.myApps.add(app);
        installManager.enqueue(app);
      }

      uiGlobals.uninstalledApps.forEach(reinstall);

      this.options.onClose(true);
      this.remove();

      uiGlobals.uninstalledApps.reset();
    }).bind(this));
  }

});

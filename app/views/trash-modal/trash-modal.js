var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');
var TrashTileView = require('../trash-tile/trash-tile.js');

var installManager = require('../../utils/install-manager.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'trash-modal',

  events: {
    'click .button.cancel': 'remove',
    'click': '_checkOutsideClick'
  },

  initialize: function() {
    var uninstalledApps = uiGlobals.uninstalledApps;

    this.injectCss();

    this.$el.append($(this.templateHtml()));

    var target = this.$('.content');

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
      target.append(view.$el);
    }).bind(this));

    this.$('.button.reinstall-all').click((function() {
      function reinstall(app) {
        uiGlobals.myApps.add(app);
        installManager.enqueue(app);
        this.options.onClose(true);
      }

      uiGlobals.uninstalledApps.forEach(reinstall.bind(this));

      this.remove();
      uiGlobals.uninstalledApps.reset();
    }).bind(this));

    // prevent swiping while modal is open
    this.$el.bind('mousedown mousemove', function(evt) {
      evt.stopPropagation();
    });
  },

  _checkOutsideClick: function(evt){
    var $target = $(evt.target);
    if ($target.parent('body').length) {
      this.remove();
    }
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    if (_.isFunction(this.options.onCancel)) {
      this.options.onCancel();
    }
    this.$el.remove();
  }

});

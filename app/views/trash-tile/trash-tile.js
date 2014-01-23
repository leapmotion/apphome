var i18n = require('../../utils/i18n.js');

var Tile = require('../tile/tile.js');

module.exports = Tile.extend({

  viewDir: __dirname,

  initialize: function(options) {
    this.initializeTile();

    this.setElement($(this.templateHtml({
        app: this.model.toJSON(),
        reinstall_label: i18n.translate('Click to Reinstall')
    })));

    this._showOrHideIcon();

    if (window.navigator.onLine) {
      this.$el.click(options.onReinstall);
    } else {
      this.$el.addClass('disabled');
    }
  }
});

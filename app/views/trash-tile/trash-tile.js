var Tile = require('../tile/tile.js');

module.exports = Tile.extend({

  viewDir: __dirname,

  initialize: function(args) {
    var leapApp = args.leapApp;

    this.initializeTile(leapApp);

    this.setElement($(this.templateHtml({
        app: this.appJson,
        reinstall_label: i18n.translate('Click to Reinstall')
    })));

    this._showOrHideIcon();

    this.$el.click(this.options.onReinstall);

  }
});

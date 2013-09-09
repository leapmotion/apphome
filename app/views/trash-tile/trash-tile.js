var Tile = require('../tile/tile.js');

module.exports = Tile.extend({

  viewDir: __dirname,

  initialize: function(args) {
    var leapApp = args.leapApp;

    this.initializeTile(leapApp);

    var templateData = leapApp.toJSON();
    templateData.iconPath = (templateData.iconPath ? this._makeFileUrl(templateData.iconPath) : '');
    templateData.tilePath = this._makeFileUrl(templateData.tilePath || config.DefaultTilePath);
    this.setElement($(this.templateHtml(templateData)));

    this._showOrHideIcon();

    this.$el.click(this.options.onReinstall);

  }
});

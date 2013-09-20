var Tile = require('../tile/tile.js');

module.exports = Tile.extend({

  viewDir: __dirname,

  initialize: function(args) {
    var leapApp = args.leapApp;

    this.initializeTile(leapApp);

    this.setElement($(this.templateHtml(this.appJson)));

    this._showOrHideIcon();

    this.$el.click(this.options.onReinstall);

  }
});

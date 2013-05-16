var BaseTile = require('../base-tile-content.js');

var StoreAppTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    this.setElement($(this.templateHtml()));

    this.initLauncher(args.path);
  }
});

module.exports = StoreAppTile;

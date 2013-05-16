var BaseTile = require('../base-tile-content.js');

var LocalAppTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    this.setElement($(this.templateHtml()));

    this.initLauncher(args.path);
  }
});

module.exports = LocalAppTile;

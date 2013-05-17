var BaseTileContent = require('../base-tile-content.js');

var StoreAppTile = BaseTileContent.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = this.leapApp = args.leapApp;
    this.setElement($(this.templateHtml()));

    this.initLauncher(args.path);
  },

  templateData: function() {
    var dirSrc = this.dirSrc();
    return _.extend({
      background_image_src: dirSrc + '/placeholder-background.png',
      icon_image_src: dirSrc + '/clear-hex.png'
    }, this.leapApp.toJSON());
  }

});

module.exports = StoreAppTile;

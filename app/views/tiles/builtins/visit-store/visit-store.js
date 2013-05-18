var BaseTile = require('../../base-tile-content.js');


var BuiltinStoreTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    this.leapApp = args.leapApp;
    this.setElement($(this.templateHtml()));
  },

  templateData: function() {
    var dirSrc = this.dirSrc();
    return _.extend({
      background_image_src: dirSrc + '/store-background.png',
      icon_image_src: dirSrc + '/store-icon.png'
    }, this.leapApp.toJSON());
  },

  setTileView: function(tileView) {
    this.tileView = tileView;
    tileView.$el.click(function() {
      nwGui.Shell.openExternal(CONFIG.VisitStoreUrl);
    });

  }

});

module.exports = BuiltinStoreTile;

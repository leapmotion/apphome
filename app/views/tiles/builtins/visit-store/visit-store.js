var BaseTile = require('../../base-tile-content.js');


var BuiltinStoreTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = this.leapApp = args.leapApp;
    this.setElement($(this.templateHtml()));
  },

  templateData: function() {
    var dirSrc = this.dirSrc();
    return _.extend({
      background_image_src: dirSrc + '/store-background.png',
      icon_image_src: dirSrc + '/store-icon.png'
    }, this.leapApp.toJSON());
  }

});

module.exports = BuiltinStoreTile;

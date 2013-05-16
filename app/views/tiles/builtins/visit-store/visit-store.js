var BaseTile = require('../../base-tile-content.js');


var BuiltinStoreTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    var leapApp = this.leapApp = args.leapApp;
    leapApp.set({
      image: 'app/views/tiles/builtins/builtin-store-tile/store-tile.png'
    }, { silent: true });

    this.injectCss();
    this.setElement($(this.templateHtml(leapApp.toJSON())));
  }
});

module.exports = BuiltinStoreTile;

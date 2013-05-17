var BaseTile = require('../base-tile-content.js');

var LocalAppTile = BaseTile.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = args.leapApp;
    var templateData = leapApp.toJSON();
    templateData.tileBgSrc = '/tbd.png';
    this.setElement($(this.templateHtml(templateData)));

    this.initLauncher(args.path);
  }
});

module.exports = LocalAppTile;

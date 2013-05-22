var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');
var Tile = require('../tile/tile.js');

var SlideView = BaseView.extend({
  viewDir: __dirname,

  className: 'slide',

  initialize: function(args) {
    args = args || {};
    this.injectCss();
    this.$el.append(this.templateHtml());
    this.$el.width(config.Layout.slideWidth);
    this.$el.height(config.Layout.slideHeight);
    if (args.disabled) {
      this.$el.addClass('disabled');
    }
    if (args.onClick) {
      this.$el.click(args.onClick);
    }
  },

  addTile: function(args) {
    var view = new Tile(args);
    this.$el.append(view.$el);
  },

  three: function() {
    if (!this._3d) {
      this._3d = new window.THREE.CSS3DObject(this.el);
    }
    return this._3d;
  },

  removeTileById: function(tileId) {
    this._existingTileById(tileId).remove();
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  }

});

module.exports = SlideView;


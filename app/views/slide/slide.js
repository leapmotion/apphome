var BaseView = require('../base-view.js');


var SlideView = BaseView.extend({
  viewDir: __dirname,

  className: 'slide',

  initialize: function(args) {
    this.injectCss();
    this.$el.append(this.templateHtml());
    this.$tiles = this.$('.tile-holder');
    this._slideNdx = args.slideNdx;
  },

  addTile: function(tileView) {
    this.removeTileById(tileView.tileId);
    this.$tiles.append(tileView.$el);
  },

  three: function() {
    if (!this._3d) {
      this._3d = new window.THREE.CSS3DObject(this.el);
    }
    return this._3d;
  },

  ndx: function() {
    return this._slideNdx;
  },

  removeTileById: function(tileId) {
    this._existingTileById(tileId).remove();
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  }

});

module.exports = SlideView;
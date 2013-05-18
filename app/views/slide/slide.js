var BaseView = require('../base-view.js');
var Tile = require('../tiles/tile/tile.js');

var SlideView = BaseView.extend({
  viewDir: __dirname,

  className: 'slide',

  initialize: function(args) {
    this.injectCss();
    this.$el.append(this.templateHtml());
    this.$tiles = this.$('.tile-holder');
  },

  addTile: function(tileModel) {
    var view = new Tile(tileModel);
//    console.log('tmp -- addTile. holder ' + this.$tiles.length + ', el ' + tileView.$el.length);
    this.$tiles.append(view.$el);
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
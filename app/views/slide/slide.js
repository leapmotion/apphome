var BaseView = require('../base-view.js');


var SlideView = BaseView.extend({
  viewDir: __dirname,

  className: 'slide',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());
  },

  addTile: function(tileView) {
    this.removeTileById(tileView.tileId);
    this.$el.prepend(tileView.$el);
  },

  removeTileById: function(tileId) {
    this._existingTileById(tileId).remove();
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  }

});

module.exports = SlideView;
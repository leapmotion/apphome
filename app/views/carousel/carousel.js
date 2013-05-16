var BaseView = require('../base-view.js');
var Slide = require('../slide/slide.js');

var TilesPerSlide = 12;


var CarouselView = BaseView.extend({
  viewDir: __dirname,

  className: 'carousel',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());

    this._slidesByNdx = {};
    this._slidesByTileId = {};
    this._slideCount = 0;
    this._currentSlide = 0;

    this.$current = this.$('.current-screen-holder');

    this.tempSlideView = new Slide();
    this.$current.append(this.tempSlideView.$el);

    // todo: multiple slides
    // todo: resorting for add/remove
  },

  addTile: function(tileView) {
    this.tempSlideView.addTile(tileView);
  },

  removeTileById: function(tileId) {
    this.tempSlideView.removeTileById(tileId);
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  }

});

module.exports = CarouselView;
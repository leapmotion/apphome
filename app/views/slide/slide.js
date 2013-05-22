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

    this._slideNum = args.slideNum;
    if (args.onDisabledClick) {
      this.$el.click(function() {
        if (this.$el.hasClass('disabled')) {
          args.onDisabledClick(this._slideNum);
        }
      }.bind(this));
    }
  },

  addTile: function(args) {
    var view = new Tile(args);
    this.$el.append(view.$el);
  },

  removeTileById: function(tileId) {
    this._existingTileById(tileId).remove();
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  },

  position: function(left, top) {
    this.$el.css({
      left: left,
      top: top
    });
  },

  enable: function() {
    this.$el.removeClass('disabled');
  },

  disable: function() {
    this.$el.addClass('disabled');
  }

});

module.exports = SlideView;


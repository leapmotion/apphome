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
    this.tiles = [];

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

  addTile: function(tile) {
    this.tiles.push(tile);
    this.$el.append(tile.$el);
  },

  position: function(left, top) {
    this.$el.css({
      left: left,
      top: top
    });
  },

  remove: function() {
    this.stopListening();

    // Detach to keep data and event listeners on the tile.
    this.tiles.forEach(function(tile) {
      tile.$el.detach();
    });

    // Now that the slide is empty, remove it.
    this.$el.remove();
  },

  enable: function() {
    this.$el.removeClass('disabled');
  },

  disable: function() {
    this.$el.addClass('disabled');
  }

});

module.exports = SlideView;


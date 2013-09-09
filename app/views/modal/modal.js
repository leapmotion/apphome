var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');
var TrashTileView = require('../trash-tile/trash-tile.js');

var installManager = require('../../utils/install-manager.js');

var Modal = BaseView.extend({

  viewDir: __dirname,

  className: 'trash-modal',

  events: {
    'click .button.cancel': 'remove',
    'click': '_checkOutsideClick'
  },

  initializeModal: function() {
    this.injectCss();

    // prevent swiping while modal is open
    this.$el.bind('mousedown mousemove', function(evt) {
      evt.stopPropagation();
    });
  },

  _checkOutsideClick: function(evt){
    var $target = $(evt.target);
    if ($target.parent('body').length) {
      this.remove();
    }
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    if (_.isFunction(this.options.onCancel)) {
      this.options.onCancel();
    }
    this.$el.remove();
  }

});

module.exports = Modal;

var BaseView = require('../base-view.js');

var Modal = BaseView.extend({

  viewDir: __dirname,

  className: 'modal',

  events: {
    'click .button.cancel': 'remove',
    'click': '_checkOutsideClick'
  },

  initializeModal: function() {
    this.injectCss();
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

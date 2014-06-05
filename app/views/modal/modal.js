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
    console.log(uiGlobals.scaling);

    var _resizing;
    $(window).resize(function() {
      if (_resizing) {
        clearTimeout(_resizing);
      }

      _resizing = setTimeout(function() {
        _resizing = undefined;
        this.$('.modal').css({
          '-webkit-transform': 'scale(' + Math.min(1, uiGlobals.scaling + 0.2) + ')',
          'transform-origin': 'center top'
        });
      }.bind(this), 20);
    });

    $(window).resize();

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

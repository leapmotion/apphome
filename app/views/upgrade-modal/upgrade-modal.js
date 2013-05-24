var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'upgrade-modal',

  initialize: function() {
    this.injectCss();
    this.$el.append($(this.templateHtml({ app: this.options.leapApp.toJSON() })));

    this.$('.button.cancel').click(this.remove.bind(this));
    this.$('.button.confirm').click(this.options.onConfirm);
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    this.$el.remove();
  }

});

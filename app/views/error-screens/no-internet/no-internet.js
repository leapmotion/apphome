var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'no-internet',

  initialize: function() {
    this.injectCss();
    this.$el.append($(this.templateHtml()));
  }

});

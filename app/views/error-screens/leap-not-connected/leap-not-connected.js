var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'leap-not-connected',

  initialize: function() {
    this.injectCss();
    this.setElement($(this.templateHtml()));
  }

});

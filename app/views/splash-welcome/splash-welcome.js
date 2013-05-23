var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'splash-welcome',

  initialize: function() {
    this.injectCss();
    this.setElement($(this.templateHtml()));

    this.$el.on('click', function() {
      uiGlobals.trigger(uiGlobals.Event.SplashWelcomeClosed);
      this.$el.remove();
    }.bind(this));
  }

});

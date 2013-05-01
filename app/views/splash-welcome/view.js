var BaseView = require('../base-view.js');

module.exports = BaseView.extend({
  viewDir: __dirname,

  initialize: function() {
    var itself = this;
    itself.injectCss();
    itself.setElement($(itself.templateHtml()));

    itself.$el.on('click', function() {
      uiGlobals.trigger(uiGlobals.Event.SplashWelcomeClosed);
      itself.$el.remove();
    });
  }
});


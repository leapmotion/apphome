var BaseView = require('../base-view.js');
var SplashWelcomeView = require('../splash-welcome/view.js');
var MyAppsView = require('../my-apps/view.js');

module.exports = BaseView.extend({
  viewDir: __dirname,
  className: 'page-container',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());

    this.$el.append((new SplashWelcomeView()).$el);
    this.$el.append((new MyAppsView()).$el);
  }
});


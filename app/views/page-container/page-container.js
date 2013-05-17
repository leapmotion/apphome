var BaseView = require('../base-view.js');
var SplashWelcomeView = require('../splash-welcome/splash-welcome.js');
var MyAppsView = require('../my-apps/my-apps.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'page-container',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());

// todo: restore   this.$el.append((new SplashWelcomeView()).$el);

    this.$el.append((new MyAppsView({
      el: this.$('#my-apps')
    })).$el);
    this._initGotoStore();

    uiGlobals.trigger(uiGlobals.Event.SplashWelcomeClosed); // todo: remove when splash is restored
  },

  _initGotoStore: function() {
    this.$('a.goto-store').click(_.debounce(function() {
      nwGui.Shell.openExternal('https://www.leapmotion.com/apps');
      return false;
    }, 350));
  }

});

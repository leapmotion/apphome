var BaseView = require('../base-view.js');
var InstalledAppView = require('../installed-app/view.js');

module.exports = BaseView.extend({
  viewDir: __dirname,
  tagName: 'ul',
  className: 'my-apps',

  initialize: function() {
    this.injectCss();
    this.$el.hide();
    uiGlobals.bind(uiGlobals.Event.SplashWelcomeClosed, function() {
      this.$el.show();
    }, this);

    this._tmpShowApp({
      name: 'Google Earth',
      image: 'app/views/installed-app/placeholder-googleEarth.png',
      path: '/Applications/Google Earth.app/'
    });
    this._tmpShowApp({
      name: 'Google Chrome',
      image: 'app/views/installed-app/placeholder-googleChrome.png',
      path: '/Applications/Google Chrome.app/'
    });
  },

  _tmpShowApp: function(args) {
    var view = new InstalledAppView(args);
    this.$el.append(view.$el);
  }
});

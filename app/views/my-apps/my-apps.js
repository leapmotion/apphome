var BaseView = require('../base-view.js');
var Carousel = require('../carousel/carousel.js');

module.exports = BaseView.extend({
  viewDir: __dirname,

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());

    this.$el.hide();
    uiGlobals.bind(uiGlobals.Event.SplashWelcomeClosed, function() {
      this.$el.show();
    }, this);

    this.$active = this.$('.active-carousel-holder');

    var installedAppsCarousel = this.installedAppsCarousel = new Carousel({
      collection: uiGlobals.leapApps
      // todo: args defining up/down buttons
    });
    this.$active.append(installedAppsCarousel.$el);

    this._initNavigationBindings();
  },


  _initNavigationBindings: function() {
    uiGlobals.on(uiGlobals.Event.GotoInstalledAppsCarousel, function() {
      // todo
    }, this);
    uiGlobals.on(uiGlobals.Event.GotoUpdateAppsCarousel, function() {
      // todo
    }, this);
    uiGlobals.on(uiGlobals.Event.GotoDeletedAppsCarousel, function() {
      // todo
    }, this);
  }

});

var BaseView = require('../base-view.js');
var Carousel = require('../carousel/carousel.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'main-page',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());
    this._linkMapping = {};
    this._initCarousels();
  },

  _initCarousels: function() {
    this.upgradeCarousel = new Carousel({
      collection: uiGlobals.availableUpgrades
    });
    this.$('#upgrades').append(this.upgradeCarousel.$el.hide());
    this._linkMapping['#upgrades-link'] = this.upgradeCarousel;

    this.installedAppsCarousel = new Carousel({
      collection: uiGlobals.installedApps
    });
    this.$('#my-apps').append(this.installedAppsCarousel.$el.hide());
    this._linkMapping['#my-apps-link'] = this.installedAppsCarousel;

    this.uninstalledAppsCarousel = new Carousel({
      collection: uiGlobals.uninstalledApps
    });
    this.$('#uninstalled').append(this.uninstalledAppsCarousel.$el.hide());
    this._linkMapping['#uninstalled-link'] = this.uninstalledAppsCarousel;

    this._initCarouselLinks();
    this._initDraggingToTrash();

    this._switchToCarousel(this.installedAppsCarousel);
  },

  _switchToCarousel: function(carousel) {
    // TODO: animate
    if (this._currentCarousel) {
      this._currentCarousel.$el.hide();
    }
    this._currentCarousel = carousel;
    this._currentCarousel.$el.show();
  },

  _initCarouselLinks: function() {
    _(this._linkMapping).each(function(carousel, selector) {
      this.$(selector).click(function() {
        if (!$(selector).hasClass('current')) {
          this._switchToCarousel(carousel);
          this.$('.carousel-link').removeClass('current');
          this.$(selector).addClass('current');
        }
      }.bind(this));
     }.bind(this));
   },

  _initDraggingToTrash: function() {
    var $trashCan = this.$('#uninstalled-link');
    $trashCan.on('dragover', function(evt) {
      if (this._currentCarousel === this.installedAppsCarousel) {
        evt.preventDefault();
      }
    }.bind(this));
    $trashCan.on('drop', function(evt) {
      evt.stopPropagation();

      var id = JSON.parse(evt.originalEvent.dataTransfer.getData('application/json')).id;
      var leapApp = uiGlobals.installedApps.get(id);

      if (leapApp) {
        leapApp.uninstall(true);
      }
    }.bind(this));
  }

});

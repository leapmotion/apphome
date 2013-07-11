var config = require('../../../config/config.js');

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
    this._setupResizeBehavior();
    $(window).resize();
    this.animateIn();
  },

  _initCarousels: function() {
    this.myAppsCarousel = new Carousel({
      collection: uiGlobals.myApps,
      position: 1
    });
    this.myAppsCarousel.hide();
    this.$('#my-apps').append(this.myAppsCarousel.$el);
    this._linkMapping['#my-apps-link'] = this.myAppsCarousel;

    this._initCarouselLinks();
    this._initTrash();

    this._switchToCarousel(this.myAppsCarousel);
  },

  _switchToCarousel: function(newCarousel) {
    if (this._currentCarousel && this._currentCarousel !== newCarousel) {
      Object.keys(this._linkMapping).forEach(function(selector) {
        if (this._linkMapping[selector] === newCarousel) {
          this.$('.carousel-link').removeClass('current');
          this.$(selector).addClass('current');
        }
      }.bind(this));
      var currentCarousel = this._currentCarousel;
      // coefficient = -1 means slide down from top, coefficient = 1 means slide up from bottom
      var coefficient = (currentCarousel.position() > newCarousel.position() ? -1 : 1);
      var windowHeight = $(window).height();
      var animating = true;
      this.$el.addClass('animating');

      newCarousel.setTop(coefficient * windowHeight);
      if (!newCarousel.isEmpty()) {
        newCarousel.show();
      }
      if (currentCarousel.isEmpty()) {
        currentCarousel.hide();
      }
      new window.TWEEN.Tween({ x: 0, y: 0 })
          .to({ x: windowHeight }, 500)
          .easing(window.TWEEN.Easing.Quartic.Out)
          .onUpdate(function() {
            newCarousel.setTop(coefficient * (windowHeight - this.x));
            currentCarousel.setTop(-coefficient * this.x);
          }).onComplete(function() {
            animating = false;
            this.$el.removeClass('animating');
            currentCarousel.setTop(0);
            newCarousel.show();
            currentCarousel.hide();
            this._currentCarousel = newCarousel;
          }.bind(this)).start();

      function animate() {
        if (animating) {
          window.requestAnimationFrame(animate);
          window.TWEEN.update();
        }
      }
      animate();
    } else {
      if (this._currentCarousel) {
        this._currentCarousel.hide();
      }
      this._currentCarousel = newCarousel;
      this._currentCarousel.show();
    }
  },

  _initCarouselLinks: function() {
    _(this._linkMapping).each(function(carousel, selector) {
      this.$(selector).click(function() {
        if (!$(selector).hasClass('current')) {
          this._switchToCarousel(carousel);
        }
      }.bind(this));
     }.bind(this));
   },

  _initTrash: function() {
    var $trashCan = this.$('#uninstalled-link');
    $trashCan.on('dragover', function(evt) {
      if (this._currentCarousel === this.myAppsCarousel) {
        evt.preventDefault();
      }
    }.bind(this));

    $trashCan.on('drop', function(evt) {
      evt.stopPropagation();

      this.$('#uninstalled-link').removeClass('highlight');

      var id = JSON.parse(evt.originalEvent.dataTransfer.getData('application/json')).id;
      var leapApp = uiGlobals.myApps.get(id);

      if (leapApp) {
        leapApp.uninstall();
      }
    }.bind(this));

    $trashCan.on('click', function() {
      if (!$trashCan.hasClass('empty')) {
        this.myAppsCarousel.switchToSlide(Infinity);
      }
    }.bind(this));

    if (uiGlobals.myApps.numUninstalled() > 0) {
      $trashCan.removeClass('empty');
    }

    uiGlobals.myApps.on('install', this._updateTrashState.bind(this));
    uiGlobals.myApps.on('uninstall', this._updateTrashState.bind(this))

    uiGlobals.myApps.on('dragstart', function() {
      this.$('#uninstalled-link').addClass('highlight');
    }.bind(this));

    uiGlobals.myApps.on('dragend', function() {
      this.$('#uninstalled-link').removeClass('highlight');
    }.bind(this));
  },

  _updateTrashState: function() {
    this.$('#uninstalled-link').toggleClass('empty', uiGlobals.myApps.numUninstalled() === 0);
  },

  _setupResizeBehavior: function() {
    var $win = $(window);
    $win.resize(function() {
      var widthRatio = ($win.width() - config.Layout.minSlidePadding) / config.Layout.slideWidth;
      var heightRatio = ($win.height() - config.Layout.minSlidePadding) / config.Layout.slideHeight;
      uiGlobals.scaling = Math.min(1, widthRatio, heightRatio);
      this.myAppsCarousel.rescale();
    }.bind(this));
  },

  animateIn: function(){
    this.$('#header').delay(800).switchClass('initial', 'loaded', 250, 'easeInOutCirc');
    this.$('.footer.initial').delay(800).switchClass('initial', 'loaded', 250, 'easeInOutCirc');
  }

});

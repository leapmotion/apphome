var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');
var Slide = require('../slide/slide.js');
var THREE = window.THREE;

var CarouselView = BaseView.extend({
  viewDir: __dirname,

  className: 'carousel',

  options: config.Layout,

  initialize: function() {
    var opts = this.options;
    this.collection = opts.collection;

    this.injectCss();
    this.$el.append(this.templateHtml());

    this._tilesPerSlide = opts.columnsPerSlide * opts.rowsPerSlide;
    this._currentSlideIndex = 0;
    this._currentPosition = 0;
    this._animating = false;

    this._initSlides();
    this._initSlideIndicator();
    this._initAddRemoveRepainting();
  },

  _initAddRemoveRepainting: function() {
    var collection = this.collection;

    collection.on('add', function(tileModel) {
      this._initSlides();
      this._initSlideIndicator();
    }, this);

    collection.on('remove', function(tileModel) {
      var slideCount = collection.pageCount(this._tilesPerSlide);
      this._initSlides();
      this._initSlideIndicator();
      if (this._currentSlideIndex >= slideCount) {
        this._currentSlideIndex--;
        this._switchToSlide(this._currentSlideIndex);
      }
    }, this);

    collection.on('sort', function() {
      this._initSlides();
    }, this);
  },

  _initSlideIndicator: function() {
    this.$('.slide-indicator').empty();
    var numSlides = this._slides.length;
    if (numSlides <= 1) {
      return;
    }
    for (var i = 0, len = numSlides; i < len; i++) {
      (function() {
        var $dot = $('<div/>');
        $dot.addClass('dot');
        $dot.attr('slide_index', i);
        if (i === this._currentSlideIndex) {
          $dot.addClass('current');
        }
        $dot.click(function() {
          if (!$dot.hasClass('current')) {
            this._switchToSlide(Number($dot.attr('slide_index')));
          }
        }.bind(this));
        this.$('.slide-indicator').append($dot);
      }.bind(this)());
    }
  },

  _initSlides: function() {
    var slideCount = this.collection.pageCount(this._tilesPerSlide);
    this._slides = [];

    this.$('.slides-holder').empty();

    for (var i = 0; i < slideCount; i++) {
      var slideView = new Slide({
        slideNum: i,
        onDisabledClick: function(slideNum) {
          this._switchToSlide(slideNum);
        }.bind(this)
      });
      this.$('.slides-holder').append(slideView.$el);
      this._slides[i] = slideView;
      if (i !== this._currentSlideIndex) {
        slideView.disable();
      }

      var leapApps = this.collection.getPageModels(i, this._tilesPerSlide);
      leapApps.forEach(function(leapApp) {
        slideView.addTile({ leapApp: leapApp });
      });
    }

    this._positionSlides();
  },

  _positionSlides: function() {
    if (this._animating) {
      return;
    }

    // in unscaled coordinates
    var firstSlideLeft = ($(window).width() - config.Layout.slideWidth * uiGlobals.scaling) / uiGlobals.scaling / 2;
    var slideTop = ($(window).height() - config.Layout.slideHeight * uiGlobals.scaling) / uiGlobals.scaling / 2;
    this._slideSpacing = $(window).width() / uiGlobals.scaling - firstSlideLeft - config.Layout.slidePeekDistance;

    var $slidesHolder = this.$('.slides-holder');
    $slidesHolder.css('-webkit-transform', 'scale(' + uiGlobals.scaling + ')');

    for (var i = 0, len = this._slides.length; i < len; i++) {
      this._slides[i].position(firstSlideLeft + this._slideSpacing * i, slideTop);
    }

    this._currentPosition = this._slideSpacing * (-1 * this._currentSlideIndex);
    $slidesHolder.css('left', this._currentPosition * uiGlobals.scaling);
  },

  _switchToSlide: function(slideNum) {
    if (!slideNum || slideNum < 0) {
      slideNum = 0;
    } else if (slideNum >= this._slides.length) {
      slideNum = this._slides.length - 1;
    }

    console.log('switching to slide #' + slideNum + ' from #' + this._currentSlideIndex);

    this._slides.forEach(function(slideView) {
      slideView.disable();
    });
    var $slidesHolder = this.$('.slides-holder');
    var currentPosition = this._currentPosition * uiGlobals.scaling; // scaled coordinates
    var distanceToSlide = (this._currentSlideIndex - slideNum) * this._slideSpacing; // unscaled (scaled below)
    var animating = this._animating = true;
    if (this._currentSlideIndex !== slideNum) {
      new window.TWEEN.Tween({ x: 0, y: 0 })
          .to({ x: distanceToSlide * uiGlobals.scaling }, Math.max(1000, Math.abs(this._currentSlideIndex - slideNum) * 333))
          .easing(window.TWEEN.Easing.Linear.None)
          .onUpdate(function() {
            $slidesHolder.css('left', currentPosition + this.x);
          }).onComplete(function() {
            animating = this._animating = false;
            this._currentSlideIndex = slideNum;
            this._slides[slideNum].enable();
            this._currentPosition += distanceToSlide;
            this._positionSlides();
            this._initSlideIndicator();
          }.bind(this)).start();

      function animate() {
        if (animating) {
          window.requestAnimationFrame(animate);
          window.TWEEN.update();
        }
      }
      animate();
    }
  },

  rescale: function() {
    this._positionSlides();
  }

});

module.exports = CarouselView;

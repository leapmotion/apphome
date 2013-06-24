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
    this._slides = [];

    var $emptyMessage = this.$('.empty-message');
    $emptyMessage.text(opts.emptyMessage || 'No apps to display.');
    $emptyMessage.height(config.Layout.emptyMessageHeight);

    this._updateSlides();
    this._updateEmptyState();
    this._updateSlideIndicator();
    this._initAddRemoveRepainting();

    $('body').mousedown(function(evt) {
      if (this._isActive) {
        this._lastMouseDownEvent = evt.originalEvent;
      }
    }.bind(this));
    $('body').mouseup(this._handlePotentialSwipe.bind(this));
  },

  _initAddRemoveRepainting: function() {
    var collection = this.collection;

    this.listenTo(collection, 'add', function(tileModel) {
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
      this._switchToSlide(Infinity);
    }, this);

    this.listenTo(collection, 'remove', function(tileModel) {
      var slideCount = collection.pageCount(this._tilesPerSlide);
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
      if (this._currentSlideIndex >= slideCount) {
        this._switchToSlide(this._currentSlideIndex - 1);
      }
    }, this);

    this.listenTo(collection, 'sort', function() {
      this._updateSlides();
    }, this);
  },

  _updateSlideIndicator: function() {
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
        $dot.click(function(evt) {
          if (!this._animating && !$dot.hasClass('current')) {
            this._switchToSlide(Number($dot.attr('slide_index')));
          }
        }.bind(this));
        this.$('.slide-indicator').append($dot);
      }.bind(this)());
    }
  },

  _updateEmptyState: function() {
    this.$el.toggleClass('empty', this.isEmpty());
  },

  _updateSlides: function() {
    var slideCount = Math.max(this.collection.pageCount(this._tilesPerSlide), 1);

    this._slides.forEach(function(slide) {
      slide.remove();
    });

    this._slides = [];

    this.$('.slides-holder').empty();

    for (var i = 0; i < slideCount; i++) {
      var slideView = new Slide({
        slideNum: i,
        onDisabledClick: function(slideNum) {
          this._switchToSlide(slideNum);
        }.bind(this)
      });

      this._slides[i] = slideView;
      if (i !== this._currentSlideIndex) {
        slideView.disable();
      }

      this.$('.slides-holder').append(slideView.$el);

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

    this._currentPosition = this._slideSpacing * (-this._currentSlideIndex);
    $slidesHolder.css('left', this._currentPosition * uiGlobals.scaling);
  },

  _validSlideNum: function(slideNum) {
    if (!slideNum || slideNum < 0) {
      return 0;
    } else if (slideNum >= this._slides.length) {
      return this._slides.length - 1;
    } else {
      return slideNum;
    }
  },

  _switchToSlide: function(slideNum) {
    slideNum = this._validSlideNum(slideNum);

    if (slideNum === this._currentSlideIndex || this._animating) {
      return;
    }

    this._slides.forEach(function(slideView) {
      slideView.disable();
    });
    var $slidesHolder = this.$('.slides-holder');
    var currentPosition = this._currentPosition * uiGlobals.scaling; // scaled coordinates
    var distanceToSlide = (this._currentSlideIndex - slideNum) * this._slideSpacing; // unscaled (scaled below)
    var animating = this._animating = true;
    new window.TWEEN.Tween({ x: 0, y: 0 }, 350)
        .to({ x: distanceToSlide * uiGlobals.scaling }, Math.max(1000, Math.abs(this._currentSlideIndex - slideNum) * 333))
        .easing(window.TWEEN.Easing.Quartic.Out)
        .onUpdate(function() {
          $slidesHolder.css('left', currentPosition + this.x);
        }).onComplete(function() {
          animating = this._animating = false;
          slideNum = this._validSlideNum(slideNum); // slides could have been removed during animation by add/remove bindings
          distanceToSlide = (this._currentSlideIndex - slideNum) * this._slideSpacing; // unscaled
          this._currentSlideIndex = slideNum;
          this._updateSlideIndicator();
          this._slides[slideNum].enable();
          this._currentPosition += distanceToSlide;
          this._positionSlides();
        }.bind(this)).start();

    function animate() {
      if (animating) {
        window.requestAnimationFrame(animate);
        window.TWEEN.update();
      }
    }
    animate();
  },

  _handlePotentialSwipe: function(evt) {
    if (!this._lastMouseDownEvent || this._animating) {
      return;
    }
    var startPos = {
      x: this._lastMouseDownEvent.x,
      y: this._lastMouseDownEvent.y
    };
    var endPos = {
      x: evt.originalEvent.x,
      y: evt.originalEvent.y
    };

    var slope = (endPos.y - startPos.y) / (endPos.x - startPos.x);
    if (!isNaN(slope) && Math.abs(endPos.x - startPos.x) > 50 &&
        Math.abs(Math.atan(slope)) < Math.PI / 4) {
      // Treat it as a swipe if the angle is less than 45 degrees from horizontal.
      if (endPos.x > startPos.x) {
        // swipe to the right
        this._switchToSlide(this._currentSlideIndex - 1);
      } else {
        // swipe to the left
        this._switchToSlide(this._currentSlideIndex + 1);
      }
    }
  },

  rescale: function() {
    this._positionSlides();
    var $emptyMessage = this.$('.empty-message');
    $emptyMessage.css('top', ($(window).height() - config.Layout.emptyMessageHeight) / 2)
  },

  position: function() {
    return this.options.position;
  },

  setTop: function(top) {
    this.$('.slides-holder').css('top', top);
  },

  isEmpty: function() {
    return this.collection.length === 0;
  },

  create: function(){
    this._isActive = true;
    this.$el.fadeIn(2000);
  },

  show: function() {
    this._isActive = true;
    this.$el.show();
  },

  hide: function() {
    this._lastMouseDownEvent = null;
    this._isActive = false;
    this.$el.hide();
  }

});

module.exports = CarouselView;

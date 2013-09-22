var config = require('../../../config/config.js');
var i18n = require('../../utils/i18n.js');

var BaseView = require('../base-view.js');
var Slide = require('../slide/slide.js');
var THREE = window.THREE;
var LeapApp = require('../../models/leap-app.js');

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
    $emptyMessage.text(opts.emptyMessage || i18n.translate('No apps to display.'));
    $emptyMessage.height(config.Layout.emptyMessageHeight);

    this._updateSlides();
    this._updateEmptyState();
    this._updateSlideIndicator();

    uiGlobals.on('swipeleft', _.debounce(function() {
      this.next();
    }.bind(this)));

    uiGlobals.on('swiperight', _.debounce(function() {
      this.prev();
    }.bind(this)));

    $('body').on('keyup', '#search', (function(evt) {
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
    }).bind(this));

    $('body').on('focusout', '#search', (function(evt) {
      $('#search').val('');
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
    }).bind(this));

    this._initAddRemoveRepainting();

    this.$('.next-slide.left').click(function(evt) {
      this.prev();
    }.bind(this));

    this.$('.next-slide.right').click(function(evt) {
      this.next();
    }.bind(this));
  },

  next: function() {
    this.switchToSlide(this._currentSlideIndex + 1);
  },

  prev: function() {
    this.switchToSlide(this._currentSlideIndex - 1);
  },

  _visibleApps: function() {
    var visibleApps;

    if ($('#search').val()) {
      visibleApps = this.collection.filter(function(app) {
        var sourceString = app.get('name').toLowerCase();
        var searchString = $('#search').val().toLowerCase();
        return sourceString.indexOf(searchString) !== -1;
      });
    } else {
      visibleApps = this.collection.models;
    }

    return visibleApps;
  },

  _getSlideModels: function(slideNumber) {
      var first = slideNumber * this._tilesPerSlide;
      return this._visibleApps().slice(first, first + this._tilesPerSlide);
  },

  _slideCount: function() {
      return Math.ceil(this._visibleApps().length / this._tilesPerSlide);
  },

  _whichSlide: function(leapApp) {
    var index = this._visibleApps().indexOf(leapApp);
    index = Math.max(Math.min(index, this._visibleApps().length - 1), 0);
    return Math.floor(index / this._tilesPerSlide);
  },

  _initAddRemoveRepainting: function() {
    var collection = this.collection;
    this.listenTo(collection, 'add', function() {
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
    }, this);

    this.listenTo(collection, 'remove', function() {
      this._updateSlides();
      this._updateEmptyState();
      this._updateSlideIndicator();
    }, this);

    this.listenTo(collection, 'sort', function() {
      this._updateSlides();
    }, this);

    this.listenTo(collection, 'change:state', function(leapApp) {
      if (leapApp.get('state') === LeapApp.States.Connecting ||
          (leapApp.isLocalApp() && leapApp.previous('state') === LeapApp.States.Uninstalled)) {
        this.switchToSlide(this._whichSlide(leapApp));
      }
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
        $dot.click(function() {
          if (!this._animating && !$dot.hasClass('current')) {
            this.switchToSlide(Number($dot.attr('slide_index')));
          }
        }.bind(this));
        this.$('.slide-indicator').append($dot);
      }.bind(this)());
    }

    this._positionSlidesIndicator();
  },

  _updateEmptyState: function() {
    this.$el.toggleClass('empty', this.isEmpty());
  },

  _updateSlides: function() {
    this._animating = false;

    this._slides.forEach(function(slide) {
      slide.remove();
    });

    this._slides = [];

    this.$('.slides-holder .slide').remove();

    for (var i = 0; i < this._slideCount(); i++) {
      var slideView = new Slide({
        slideNum: i,
        onDisabledClick: function(slideNum) {
          this.switchToSlide(slideNum);
        }.bind(this)
      });

      this._slides[i] = slideView;
      if (i !== this._currentSlideIndex) {
        slideView.disable();
      }

      this.$('.slides-holder').append(slideView.$el);

      var leapApps = this._getSlideModels(i);
      leapApps.forEach(function(leapApp) {
        slideView.addTile({ leapApp: leapApp });
      });
    }

    this._positionSlides();
    this._updateNextSlideControls();

    if (this._currentSlideIndex >= this._slideCount()) {
      this.switchToSlide(this._currentSlideIndex - 1);
    }
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

    this.$('.next-slide').css({
      height: config.Layout.nextSlideHeight * uiGlobals.scaling,
      top: (slideTop + config.Layout.nextSlideOffset) * uiGlobals.scaling
    });

    this._positionSlidesIndicator();
  },

  _positionSlidesIndicator: function() {
    var $slidesIndicator = this.$('.slide-indicator');
    $slidesIndicator.css('left', ($(window).width() - $slidesIndicator.width()) / 2);
  },

  _updateNextSlideControls: function() {
    this.$('.next-slide').hide();
    if (!this._animating) {
      if (this._currentSlideIndex > 0) {
        this.$('.next-slide.left').css('display', '');
      }
      if (this._currentSlideIndex < this._slides.length - 1) {
        this.$('.next-slide.right').css('display', '');
      }
    }
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

  switchToSlide: function(slideNum) {
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
    this._updateNextSlideControls();

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
          this._updateNextSlideControls();
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
    return this._visibleApps().length === 0;
  },

  show: function() {
    this.$el.show();
  },

  hide: function() {
    this.$el.hide();
  },

});

module.exports = CarouselView;

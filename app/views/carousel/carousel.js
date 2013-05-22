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

    this.$previousSlideHolder = this.$('.slide-holder.previous');
    this.$currentSlideHolder = this.$('.slide-holder.current');
    this.$nextSlideHolder = this.$('.slide-holder.next');

    this._tilesPerSlide = opts.columnsPerSlide * opts.rowsPerSlide;
    this._slideCount = this.collection.pageCount(this._tilesPerSlide);
    this._currentSlideNdx = 0;
    this._initSlideIndicator();
    this.showSlide(0);

    this._initAddRemoveRepainting();
  },

  _initAddRemoveRepainting: function() {
    var collection = this.collection;

    collection.on('add', function(tileModel) {
      var slideNumber = collection.whichPage(tileModel, this._tilesPerSlide);
      this._slideCount = collection.pageCount(this._tilesPerSlide);
      this._initSlideIndicator();
      if (slideNumber <= this._currentSlideNdx) {
        this.showSlide(slideNumber);
      }
    }, this);

    collection.on('remove', function(tileModel) {
      var changedSlideNumber = collection.whichPage(collection.indexOf(tileModel) - 1, this._tilesPerSlide);
      this._slideCount = collection.pageCount(this._tilesPerSlide);
      if (this._currentSlideNdx >= this._slideCount) {
        this._currentSlideNdx--;
        this.showSlide(this._currentSlideNdx);
      } else if (this._currentSlideNdx >= changedSlideNumber) {
        this.showSlide(this._currentSlideNdx);
      }
      this._initSlideIndicator();
    }, this);

    collection.on('sort', function() {
      this.showSlide(this._currentSlideNdx);
    }, this);
  },

  _initSlideIndicator: function() {
    this.$('.slide-indicator').empty();
    if (this._slideCount <= 1) {
      return;
    }
    for (var i = 0; i < this._slideCount; i++) {
      (function() {
        var $dot = $('<div/>');
        $dot.addClass('dot');
        $dot.attr('slide_index', i);
        if (i === this._currentSlideNdx) {
          $dot.addClass('current');
        }
        $dot.click(function() {
          if (!$dot.hasClass('current')) {
            this.showSlide(Number($dot.attr('slide_index')));
          }
        }.bind(this));
        this.$('.slide-indicator').append($dot);
      }.bind(this)());
    }
  },

  _buildSlideView: function(slideNumber, disabled) {
    var slideView;
    if (disabled) {
      slideView = new Slide({
        disabled: true,
        onClick: function() {
          this.showSlide(slideNumber);
        }.bind(this)
      });
    } else {
      slideView = new Slide();
    }

    var leapApps = this.collection.getPageModels(slideNumber, this._tilesPerSlide);
    leapApps.forEach(function(leapApp) {
      slideView.addTile({ leapApp: leapApp });
    });
    return slideView;
  },

  _paintSlide: function($holder, slideNumber, disabled) {
    var slideView = this._buildSlideView(slideNumber, disabled);
    $holder.append(slideView.$el);
    return slideView;
  },

  showSlide: function(slideNumber) {
    if (!slideNumber || slideNumber < 0) {
      slideNumber = 0;
    } else if (slideNumber >= this._slideCount) {
      slideNumber = this._slideCount - 1;
    }

    this._currentSlideNdx = slideNumber;
    this.$currentSlideHolder.empty();
    this._paintSlide(this.$currentSlideHolder, slideNumber);

    this.$previousSlideHolder.empty();
    if (slideNumber > 0) {
      this._paintSlide(this.$previousSlideHolder, slideNumber - 1, true);
    }

    this.$nextSlideHolder.empty();
    if (slideNumber < this._slideCount - 1) {
      this._paintSlide(this.$nextSlideHolder, slideNumber + 1, true);
    }

    this._updateSlideNavigation();
    this.rescale();
  },

  _updateSlideNavigation: function() {
    var $dots = this.$('.slide-indicator .dot');
    $dots.removeClass('current');
    $($dots[this._currentSlideNdx]).addClass('current');
  },

  rescale: function() {
    var currentLeftOffset = ($(window).width() - config.Layout.slideWidth * uiGlobals.scaling) / uiGlobals.scaling / 2;
    var topOffset = ($(window).height() - config.Layout.slideHeight * uiGlobals.scaling) / uiGlobals.scaling / 2;

    this.$('.slide-holder').css('-webkit-transform', 'scale(' + uiGlobals.scaling + ')');

    this.$previousSlideHolder.find('.slide').css({
      left: 50 - config.Layout.slideWidth,
      top: topOffset
    });

    this.$currentSlideHolder.find('.slide').css({
      left: currentLeftOffset,
      top: topOffset
    });

    this.$nextSlideHolder.find('.slide').css({
      left: $(window).width() - 50,
      top: topOffset
    });
  }


//  _tmp3dPlay: function() {
//    var camera = this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
//    var scene = this.scene = new THREE.Scene();
//    var renderer = this.renderer = new THREE.CSS3DRenderer();
//    renderer.setSize( window.innerWidth, window.innerHeight );
////    renderer.domElement.style.position = 'absolute'; // ?
//
//    var slideView = this._slideViewByTileNdx(0);
//    var threeObj = slideView.three();
//    this.scene.add(threeObj);
//    slideView.$el.click(function() {
//      threeObj.position.z = threeObj.position.z - 400;
//    });
//
//    var animate = function() {
//      window.requestAnimationFrame(animate);
//      renderer.render(scene, camera);
//      window.TWEEN.update();
//    }
//    animate();
//  },

});

module.exports = CarouselView;

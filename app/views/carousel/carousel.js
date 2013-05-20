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
    this._initNavigationControls();

    this.$currentScreenHolder = this.$('.current-screen-holder');
    // todo: are we displaying previews of next/previous slides? Mockups are unclear about it
    //    this.$previousScreenHolder = this.$('.previous-screen-holder');
    //    this.$nextScreenHolder = this.$('.next-screen-holder');

    this._tilesPerSlide = opts.columnsPerSlide * opts.rowsPerSlide;
    this._slideCount = this.collection.pageCount(this._tilesPerSlide);
    this._currentSlideNdx = 0;
    this.showSlide(0);

    this._initAddRemoveRepainting();

  },

  _initAddRemoveRepainting: function() {
    var collection = this.collection;
    var repaint = _.debounce(function(slideNumber) {
      this._slideCount = collection.pageCount(this._tilesPerSlide);
      this.showSlide(slideNumber);
    }.bind(this), 300);

    collection.on('add', function(tileModel) {
      var slideNumber = collection.whichPage(tileModel, this._tilesPerSlide);
      if (slideNumber === this._currentSlideNdx) {
        repaint(slideNumber);
      }
    }, this);

    collection.on('remove', function(tileModel) {
      var changedSlideNumber = collection.whichPage(collection.indexOf(tileModel) - 1, this._tilesPerSlide);
      if (this._currentSlideNdx >= changedSlideNumber) {
        this.showSlide(this._currentSlideNdx);
      }
    }, this);

    collection.on('sort', function() {
      this.showSlide(this._currentSlideNdx);
    }, this);

  },

  _initNavigationControls: function() {
    var $navButtons = this.$('.nav-btn');
    var $previous = this.$previousButton = this.$('.go-previous');
    var $next = this.$nextButton = this.$('.go-next');

    $navButtons.click(function(evt) {
      var $clicked = $(evt.target);
      if ($clicked.hasClass('disabled')) {
        return;
      }
      var advance = $clicked.attr('advance');
      var gotoSlide = $clicked.attr('slide');
      var slideNumber;
      if (advance) {
        slideNumber = this._currentSlideNdx + (advance === 'next' ? 1 : -1);
      } else if (gotoSlide) {
        var slideNumber = parseInt(gotoSlide);
      }
      if (_.isNumber(slideNumber)) {
        this.showSlide(slideNumber);
        return false;
      }
    }.bind(this));
  },

  _buildSlideView: function(slideNumber) {
    var slideView = new Slide();
    var leapApps = this.collection.getPageModels(slideNumber, this._tilesPerSlide);
    leapApps.forEach(function(leapApp) {
      slideView.addTile({ leapApp: leapApp });
    });
    return slideView;
  },

  showSlide: function(slideNumber) {
    if (!slideNumber || slideNumber < 0) {
      slideNumber = 0;
    } else if (slideNumber >= this._slideCount) {
      slideNumber = this._slideCount - 1;
    }
    var slideView = this._buildSlideView(slideNumber);
    this.$currentScreenHolder.empty();
    this.$currentScreenHolder.append(slideView.$el);
    this._currentSlideNdx = slideNumber;
    this._updateSlideNavigation();
  },

  _updateSlideNavigation: function() {
    this.$previousButton.toggleClass('disabled', this._currentSlideNdx <= 0);
    this.$nextButton.toggleClass('disabled', this._currentSlideNdx + 1 >= this._slideCount);
    // todo: footer button thingies
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

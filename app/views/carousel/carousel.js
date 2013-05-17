var BaseView = require('../base-view.js');
var Slide = require('../slide/slide.js');
var THREE = window.THREE;

var CarouselView = BaseView.extend({
  viewDir: __dirname,

  className: 'carousel',

  options: {
    columnsPerSlide: 3, // todo: 4
    rowsPerSlide: 2 // todo: 3
  },

  initialize: function() {
    var opts = this.options;
    this.injectCss();
    this.$el.append(this.templateHtml());


    this._slides = [];
    this._slidesByTileId = {};
    this._tilesById = {};
    this._slideCount = 0;
    this._tileCount = 0;
    this._tilesPerSlide = opts.columnsPerSlide * opts.rowsPerSlide;

    this._currentSlideNdx = 0;
    this.$currentScreenHolder = this.$('.current-screen-holder');
    this.$previousScreenHolder = this.$('.previous-screen-holder');
    this.$nextScreenHolder = this.$('.next-screen-holder');

    this.$currentScreenHolder.append(this._slideViewByTileNdx(0).$el.show());


//    this._tmp3dPlay();

    // todo: resorting for add/remove
  },

  _tmp3dPlay: function() {
    var camera = this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
    var scene = this.scene = new THREE.Scene();
    var renderer = this.renderer = new THREE.CSS3DRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
//    renderer.domElement.style.position = 'absolute'; // ?

    var slideView = this._slideViewByTileNdx(0);
    var threeObj = slideView.three();
    this.scene.add(threeObj);
    slideView.$el.click(function() {
      threeObj.position.z = threeObj.position.z - 400;
    });

    var animate = function() {
      window.requestAnimationFrame(animate);
      renderer.render(scene, camera);
      window.TWEEN.update();
    }
    animate();
  },

  addTile: function(tileView) {
    var tileId = tileView.tileId;
    if (this._tilesById[tileId]) {
      // redraw?
    } else {
      var tileNdx = this._tileCount;
      ++this._tileCount;
      tileView.tileNdx = tileNdx;
      this._tilesById[tileId] = tileView;
      var slideView = this._slideViewByTileNdx(tileNdx);
      this._slidesByTileId[tileId] = slideView;
      slideView.addTile(tileView);
    }
  },

  removeTileById: function(tileId) {
    var $existing = this._existingTileById(tileId);
    if ($existing.length) {
      --this._tileCount;
      $existing.remove();
      // todo: check if slide is empty
    }
  },

  _existingTileById: function(tileId) {
    return this.$('.tile[tile_id=' + tileId + ']');
  },

  _slideViewByTileNdx: function(tileNdx) {
    var slideNdx = Math.floor(tileNdx / this._tilesPerSlide);
    return this._slides[slideNdx] || this._createSlideView(slideNdx) ;
  },

  _createSlideView: function(slideNdx) {
    var slideView = new Slide({
      slideNdx: slideNdx
    });
    ++this._slideCount;
    if (slideNdx !== this._currentSlideNdx) {
      slideView.$el.hide();
    }

    this._slides[slideNdx] = slideView;
    this._updateSlideNavigation();
    return slideView;
  },

  _updateSlideNavigation: function() {

    // todo: update next/prev holders
    // todo: show/hide left/right
  }

});

module.exports = CarouselView;
var integrationTest = require('../integration-test.js');
var leapAppFactory = require('../../support/leap-app-factory.js');

integrationTest.runInApp(__filename, function() {

  var leapApps;
  describe('pagination', function() {
    before(function(){
      leapApps = uiGlobals.installedApps;
      var tileCount = leapApps.length;
      var desired = 20;
      if (tileCount < desired) {
        for (var i = 0, len = desired - tileCount; i < len; i++) {
          leapApps.add(leapAppFactory.storeAppData());
        }
      }
    });

    it('should advance on click', function(done) {
      window.waitFor('tiles', '.tile:visible', done).then(function() {
        assert.ok($('.go-previous:visible').hasClass('disabled'), 'should start previous slide button disabled');
        var $next = $('.go-next:visible');
        assert.ok(!$next.hasClass('disabled'), 'should start with next slide button enabled');
        var lastTileId = $('.tile:visible:last').attr('tile_id');
        assert.ok($('.tile[tile_id="' + lastTileId + '"]').length, 'should be able to find tile by id');
        $next.click();
        assert.ok(!$('.tile[tile_id="' + lastTileId + '"]').length, 'tile from previous slide should not be on next slide');

        var $previous = $('.go-previous:visible');
        assert.ok(!$previous.hasClass('disabled'), 'should enable previous slide button');
        $previous.click();
        assert.ok($('.tile[tile_id="' + lastTileId + '"]').is(':visible'), 'tile should be visible again');

        done();
      });
    });

  });

//  TODO: describe('repaint when adding apps', function() {
//
//  });
});

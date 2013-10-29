var integrationTest = require('../integration-test.js');
var leapAppFactory = require('../../support/leap-app-factory.js');

integrationTest.setTestOptions({

});

integrationTest.runInApp(__filename, function() {

  var leapApps;
  describe('pagination', function() {
    before(function() {
      leapApps = uiGlobals.myApps;
      var tileCount = leapApps.length;
      var desired = 25;
      if (tileCount < desired) {
        for (var i = 0, len = desired - tileCount; i < len; i++) {
          leapApps.add(leapAppFactory.storeAppData());
        }
      }
    });

    it('should advance on click', function(done) {
      this.timeout(50000);
      window.waitFor('page to load', '.slide:visible', done, { maxDuration: 20000 }, function() {
        $('.slide:eq(2)').click();
        window.waitFor('slide to transition', function() {
          return !$('.slide:eq(2)').hasClass('disabled');
        }, done, function() {
          assert.ok($('.slide:eq(1)').hasClass('disabled'), 'first slide is disabled after transition');
          assert.ok($('.slide:eq(3)').hasClass('disabled'), 'third slide is also disabled');
          done();
        });
      });
    });

  });
});

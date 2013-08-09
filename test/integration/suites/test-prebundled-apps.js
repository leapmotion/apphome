var integrationTest = require('../integration-test.js');
var config = require('../../../config/config.js');

integrationTest.setTestOptions({
  prebundlingComplete: false
});

integrationTest.runInApp(__filename, function() {
  describe('prebundled apps installed', function() {
    it('should create leapApp models from persisted data', function(done) {
      this.timeout(100000);
      uiGlobals.bootstrapPromises.afterwardsAsyncKickoffs.always(function() {
        assert.ok(uiGlobals.myApps.length >= 1, 'should add models to central leapApp collection');
        console.log('myapps', JSON.stringify(uiGlobals.myApps.toJSON()));
        var expected = uiGlobals.myApps.findWhere({ name: 'Boom Ball' });
        assert.equal(expected.get('appId'), 74, 'should load existing app');
        done();
      });
    });
  });
});

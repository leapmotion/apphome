var integrationTest = require('../integration-test.js');
var config = require('../../../config/config.js');
var db = require('../../../app/utils/db.js');
var leapAppFactory = require('../../support/leap-app-factory.js');

// rebuild db early (before app loads)
if (global.isRunningTest()) {
  var leapApps = [];
  leapApps.push(leapAppFactory.storeAppData({
    id: 2234,
    app_id: 500,
    name: 'PopCAD'
  }));
  leapApps.push(leapAppFactory.storeAppData());
  leapApps.push(leapAppFactory.storeAppData());
  db.setItem(config.DbKeys.InstalledApps, JSON.stringify(leapApps));
}


integrationTest.runInApp(__filename, function() {

  describe('apps hydrated', function() {
    it('should create leapApp models from persisted data', function() {
      assert.ok(uiGlobals.myApps.length >= 3, 'should add models to central leapApp collection');
      var expected = uiGlobals.myApps.findWhere({ name: 'PopCAD' });
      assert.equal(expected.get('appId'), 500, 'should load existing app');
    });
  });

});

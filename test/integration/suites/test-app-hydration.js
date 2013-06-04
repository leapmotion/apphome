var integrationTest = require('../integration-test.js');
var config = require('../../../config/config.js');
var db = require('../../../app/utils/db.js');
var leapAppFactory = require('../../support/leap-app-factory.js');

// rebuild db early (before app loads)
if (global.isRunningTest()) {
  console.log('\n\nRebuilding database for test');
  window.localStorage.clear();
  var leapApps = [];
  leapApps.push(leapAppFactory.storeAppData({
    id: 'x500',
    app_id: 1,
    name: 'PopCAD'
  }));
  leapApps.push(leapAppFactory.localAppData());
  leapApps.push(leapAppFactory.storeAppData());
  db.setItem(config.DbKeys.InstalledApps, JSON.stringify(leapApps));
}


integrationTest.runInApp(__filename, function() {

  describe('apps hydrated', function() {
    it('should create leapApp models from persisted data', function() {
      assert.equal(uiGlobals.installedApps.length, 3, 'should add models to central leapApp collection');
      var expected = uiGlobals.installedApps.find(function(leapApp) {
        return leapApp.get('name') === 'PopCAD';
      });
      assert.equal(expected.id, 'x500', 'should load existing app');
    });
  });

});

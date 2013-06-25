var integrationTest = require('../integration-test.js');
var fakePubnub = require('../../support/fake-pubnub.js');

integrationTest.runInApp(__filename, function() {
  var api = require('../../../app/utils/api.js');
  var LeapApp = require('../../../app/models/leap-app.js');

  describe('new apps and upgrades', function() {

    it('should start downloading new apps', function(done) {
      this.timeout(50000);
      window.waitFor('auth', function() { return api.hasEverConnected; }, done, { maxDuration: 20000 }, function() {
        var numDownloads = uiGlobals.availableDownloads.length;
        var numApps = uiGlobals.installedApps.length;
        fakePubnub.triggerNewApp(10);
        assert.equal(uiGlobals.installedApps.length, numApps + 1, 'new app is added to installed apps');
        window.waitFor('install to fail', '! .tile.installing, .tile.downloading', done, { maxDuration: 10000 }, function() {
          assert.equal(uiGlobals.installedApps.length, numApps, 'app gets removed from installed apps after install fails');
          assert.equal(uiGlobals.availableDownloads.length, numDownloads + 1, 'app gets added to available downloads after install fails');
          done();
        });
      });
    });

    it('should show upgrades', function(done) {
      this.timeout(60000);
      window.waitFor('auth', function() { return api.hasEverConnected; }, done, { maxDuration: 20000 }, function() {
        $('#downloads-link').click();
        var app = uiGlobals.availableDownloads.findWhere({ appId : 1});
        uiGlobals.availableDownloads.remove(app);
        app.set('version', '0.0.0');
        app.set('state', LeapApp.States.Ready);
        uiGlobals.installedApps.add(app);
        var numDownloads = uiGlobals.availableDownloads.length;
        var numApps = uiGlobals.installedApps.length;
        var numTrashed = uiGlobals.uninstalledApps.length;
        fakePubnub.triggerAppUpgrade(1, '1.0.0');
        assert.equal(uiGlobals.availableDownloads.length, numDownloads + 1, 'upgrade is added to available downloads');
        var $upgradeTile = $('#downloads .tile.upgrade');
        assert.ok($upgradeTile.length, 'the upgrade tile exists');
        $upgradeTile.click();
        var $confirmButton = $('.modal .confirm.upgrade');
        assert.ok($confirmButton.length, 'the confirm button exists on the upgrade modal');
        $confirmButton.click();
        assert.equal(uiGlobals.availableDownloads.length, numDownloads, 'upgrade is added to installed apps');
        window.waitFor('install to fail', '! .tile.installing, .tile.downloading', done, { maxDuration: 30000 }, function() {
          assert.equal(uiGlobals.availableDownloads.length, numDownloads + 1, 'upgrade is listed as an installable app');
          assert.equal(uiGlobals.installedApps.length, numApps - 1, 'the app was removed from the installed apps');
          assert.equal(uiGlobals.uninstalledApps.length, numTrashed + 1, 'old version is still in the trash, because reinstall failed too');
          done();
        });
      });
    });

  });

});

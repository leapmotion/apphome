var integrationTest = require('../integration-test.js');
var db = require('../../../app/utils/db.js');

integrationTest.runInApp(__filename, function() {

  describe('namespaced access', function() {
    beforeEach(function(){
      window.localStorage.clear();
    });

    it('should prefix keys with db environment', function() {
      assert.equal(global.leapEnv, 'test', 'test runner should set leapEnv to test');
      db.setItem('hello', 'cruel world');
      assert.equal(window.localStorage.getItem('test:hello'), 'cruel world', 'should store with correct prefix');
      assert.ok(!window.localStorage.getItem('hello'), 'should not store without prefix');
    });

  });

});

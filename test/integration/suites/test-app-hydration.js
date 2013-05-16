var integrationTest = require('../integration-test.js');
var db = require('../../../app/utils/db.js');

integrationTest.runInApp(__filename, function() {

  describe('apps hydrated', function() {
    beforeEach(function(){
      window.localStorage.clear();
      // todo: fake serialized apps
    });

  });

});

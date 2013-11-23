var support = require('../support/support.js');
var wd = require('wd');

describe('downloading', function() {

  var browser = wd.promiseChainRemote();

  beforeEach(function(done) {
    this.timeout(40000);
    support.loadApp(browser)
      .then(function() {
        return support.login(browser);
      })
      .then(done);
  });

  it('should start on first login and be cancellable', function(done) {
    this.timeout(5000);
    browser
      .elementById('cancel-all').isVisible().should.become(true)
      .then(function() {
        return browser
          .elementById('cancel-all').click();
      })
      .elementById('download-all').isVisible().should.become(true)
      .notify(done);
  });

  afterEach(function(done) {
    this.timeout(10000);
    browser
        .quit()
        .then(done);
  });

});


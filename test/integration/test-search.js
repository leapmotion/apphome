var support = require('../support/support.js');
var wd = require('wd');

describe('search', function() {

  var browser = wd.promiseChainRemote();

  beforeEach(function(done) {
    this.timeout(40000);
    support.loadApp(browser)
      .then(function() {
        return support.login(browser);
      })
      .elementById('cancel-all').click()
      .then(function() {
        done();
      });
  });

  it('should filter to only show apps with case-insensitively matching names', function(done) {
    browser
      .elementByCssSelector('#search').type('orientation')
      .elementsByCssSelector('.tile').then(function(elements) {
        elements.length.should.equal(1);
      }).then(function() {
        done();
      });
  });

  afterEach(function(done) {
    this.timeout(10000);
    browser
      .quit()
      .then(done);
  });

});


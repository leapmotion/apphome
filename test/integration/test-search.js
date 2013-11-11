var support = require('../support/support.js');
var wd = require('wd');

describe('search', function() {

  var browser = wd.promiseChainRemote();

  before(function(done) {
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

  describe('case-insensitivity', function() {
    // Clear the search bar before each test
    beforeEach(function(done) {
      browser.elementByCssSelector('#search').clear()
      .then(function() {
        done();
      });
    });

    it('should accept all lower-case names', function(done) {
      browser
        .elementByCssSelector('#search').type('orientation')
        .elementsByCssSelector('.tile').then(function(elements) {
          elements.length.should.equal(1);
          elements[0].text().should.eventually.equal('Orientation').and.notify(done);
        });
    });
        
    it('should accept a name with a leading upper-case character', function(done) {
      browser
        .elementByCssSelector('#search').type('Orientation')
        .elementsByCssSelector('.tile').then(function(elements) {
          elements.length.should.equal(1);
        }).then(done, done);
    });
        
    it('should accept all upper-case names', function(done) {
      browser
        .elementByCssSelector('#search').type('ORIENTATION')
        .elementsByCssSelector('.tile').then(function(elements) {
          elements.length.should.equal(1);
        }).then(done, done);
    });
        
    it('should accept mixed-case names', function(done) {
      browser
        .elementByCssSelector('#search').type('oRiEnTaTiOn')
        .elementsByCssSelector('.tile').then(function(elements) {
          elements.length.should.equal(1);
        }).then(done, done);
    });
  });
  
  after(function(done) {
    this.timeout(10000);
    browser
      .quit()
      .then(done);
  });

});


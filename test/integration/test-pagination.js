var support = require('../support/support.js');
var wd = require('wd');

describe('pagination', function() {

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

  it('should show left/right pagination controls when there are more than 12 tiles', function(done) {
    browser
      .elementByCssSelector('.next-slide.right').isVisible().should.become(true)
      .then(function() {
        return browser
          .elementByCssSelector('.next-slide.right').click();
      })
      .then(function() {
        setTimeout(function() {
          browser
            .elementByCssSelector('.next-slide.left').isVisible().should.become(true)
            .notify(done);
        }, 1000);
      });
  });

  it('should show pagination dots when there are more than 12 tiles and they should be clickable', function(done) {
    browser
      .elementByCssSelector('.slide-indicator .dot:last-of-type').isVisible().should.become(true)
      .then(function() {
        return browser
          .elementByCssSelector('.slide-indicator .dot:last-of-type').click();
      })
      .then(function() {
        setTimeout(function() {
          browser
            .elementByCssSelector('.slide-indicator .dot:last-of-type').getAttribute('class').should.eventually.include('current')
            .notify(done);
        }, 1000);
      });
  });

  afterEach(function(done) {
    this.timeout(10000);
    browser
      .quit()
      .then(done);
  });

});


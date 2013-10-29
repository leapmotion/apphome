var support = require('./support/support.js');

describe('something', function() {

  var browser = wd.promiseChainRemote();

  it('should show the login screen on non-first-run', function(done) {
    this.timeout(200000);
    support.loadApp(browser).then(function() {
      return support.login(browser);
    })
    .then(function() {
      //done();
    });
  });

  it('should show splash on first-run', function(done) {
    this.timeout(200000);
    support.loadApp(browser, true)
      .waitForElementById('continue')
      .elementById('continue')
      .click()
      .waitForElementByClassName('stage2')
      .elementById('launch-airspace')
      .click()
      .then(function() {
        return support.switchToMainWindow(browser);
      })
      .waitForElementByClassName('authorization')
      .elementByClassName('authorization')
      .getAttribute('class').should.eventually.include('first-run')
      .then(function() {
        return support.login(browser);
      })
      .then(function() {
        //done();
      });
  });

  afterEach(function(done) {
    browser.quit().then(done);
  });

});


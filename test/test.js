var support = require('./support/support.js');

describe('something', function() {

  var browser = wd.promiseChainRemote();

  it('should show the login screen on non-first-run', function(done) {
    this.timeout(200000);
    support.loadApp(browser)
      .elementByTagName('iframe')
      .getAttribute('src').should.eventually.include('central.leapmotion.com')
      .notify(done);
  });

  it('should do OOBE on first-run', function(done) {
    this.timeout(200000);
    support.loadApp(browser, true)
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
        done();
      });
  });

  afterEach(function(done) {
    browser
      .quit()
      .then(done);
  });

});


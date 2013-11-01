var support = require('../support/support.js');
var wd = require('wd');

describe('startup', function() {

  var browser = wd.promiseChainRemote();

  it('should do OOBE on first-run and then show the login screen', function(done) {
    this.timeout(20000);
    support.loadApp(browser, true /* first run */)
      .waitForElementById('continue')
      .elementById('continue').click()
      .waitForElementByClassName('stage2')
      .then(function() {
        // need to close the splash async, because this call doesn't return properly for some reason (probably because it closes the window)
        browser.executeAsync('global.$("#launch-airspace", document).click()');
        return support.switchToMainWindow(browser);
      })
      .waitForElementByClassName('authorization')
      .elementByClassName('authorization').getAttribute('class').should.eventually.include('first-run')
      .then(function() {
        return browser
          .waitForElementByTagName('iframe')
          .elementByTagName('iframe').getAttribute('src');
      }).should.eventually.include('central.leapmotion.com')
      .notify(done);
  });

  it('should show the login screen on non-first-run', function(done) {
    this.timeout(20000);
    support.loadApp(browser)
      .waitForElementByTagName('iframe')
      .elementByTagName('iframe').getAttribute('src').should.eventually.include('central.leapmotion.com')
      .notify(done);
  });

  afterEach(function(done) {
    this.timeout(10000);
    browser
      .quit()
      .then(done);
  });

});


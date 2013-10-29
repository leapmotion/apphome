global._ = require('underscore');
global.Q = require('q');
global.wd = require('wd');
global.config = require('../../config/config.js');

var chai = require('chai');
chai.use(require('chai-as-promised')).should();

function pollingDeferred(pollFn, checkFn, interval) {
  interval = (typeof timeout === 'undefined' ? 100 : interval);
  var deferred = Q.defer();
  function poll() {
    pollFn().then(function() {
      var result = checkFn.apply(null, arguments);
      if (result) {
        deferred.resolve(result);
      } else {
        setTimeout(poll, interval);
      }
    });
  }
  poll();
  return deferred.promise;
}

function waitForWindowHandlesLength(browser, length) {
  return pollingDeferred(function() {
      return browser.windowHandles()
    }, function(handles) {
      return handles.length < length || handles;
    });
}

function setDbValue(browser, key, value) {
  var command = 'require("./app/utils/db.js").setItem(' +
                JSON.stringify(key) + ', ' +
                JSON.stringify(value) + ');';
  return browser.execute(command);
}

function waitForBodyLoad(browser) {
  return pollingDeferred(function() {
      return browser
        .elementByTagName('body')
        .getAttribute('class');
    }, function(classes) {
      return /\bloading\b/.test(classes);
    });
}

function loadApp(browser, firstRun) {
  var appPromise = browser
    .init({ browserName: 'chrome' })
    .get('file://' + __dirname + '/../../index.html');

  if (firstRun) {
    appPromise = appPromise
      .execute('window.__runApp();')
      .then(function() {
        return waitForWindowHandlesLength(browser, 2);
      })
      .then(function(handles) {
        return browser.window(handles[1]); // select first-run splash
      });
  } else {
    appPromise = appPromise
      .then(function() {
        return setDbValue(browser, config.DbKeys.AlreadyDidFirstRun, true);
      })
      .execute('window.__runApp();');
  }

  return appPromise;
}

function switchToMainWindow(browser) {
  return browser
    .windowHandles()
    .then(function(handles) {
      return browser.window(handles[0]);
    });
}

function login(browser, email, password) {
  email = email || process.env.LEAPHOME_LOGIN_EMAIL;
  password = password || process.env.LEAPHOME_LOGIN_PASSWORD;
  return browser
    .waitForElementByCssSelector('.authorization iframe')
    .frame(0)
    .eval('location.pathname')
    .then(function(pathname) {
      if (pathname === '/users/sign_up') {
        return browser
          .waitForElementByTagName('form')
          .elementByClassName('auth-link')
          .click();
      }
    })
    .waitForElementByTagName('form')
    .elementById('user_email')
    .type(email)
    .elementById('user_password')
    .type(password)
    .elementByTagName('form')
    .submit()
    .then(function() {
      return waitForBodyLoad(browser);
    });
}

module.exports.loadApp = loadApp;
module.exports.switchToMainWindow = switchToMainWindow;
module.exports.login = login;

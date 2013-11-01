var assert = require('assert');

var semver = require('../../../app/utils/semver.js');

describe('semver', function() {

  it('should compare versions correctly', function() {
    assert.ok(semver.isFirstGreaterThanSecond('1', '0.99.99.99-dev'));
    assert.ok(semver.isFirstGreaterThanSecond('1.0.1.1', '1.0.1-dev'));
    assert.ok(semver.isFirstGreaterThanSecond('1.1.0-dev', '1.0.99'));
    assert.ok(semver.isFirstGreaterThanSecond('1.1.0.0', '1.0.99.99.99'));
    assert.ok(!semver.isFirstGreaterThanSecond('1.0.1', '1.0.1-dev'));
    assert.ok(!semver.isFirstGreaterThanSecond('0.99', '1'));
  });

});

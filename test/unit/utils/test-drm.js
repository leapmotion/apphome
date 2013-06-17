require('../env.js');
var assert = require('assert');
var path = require('path');
var rewire = require('rewire');

var AuthId = '1234';
var Token = 'DEADBEEF123';

describe('drm XML writing', function() {
  it('should write tt.xml on Windows', function(done) {
    process.env.APPDATA = process.env.APPDATA || '';

    var drm = rewire('../../../app/utils/drm.js');

    drm.__set__('os', _(require('os')).extend({
      platform: function() {
        return 'win32';
      }
    }));

    drm.__set__('fs', _(require('fs-extra')).extend({
      mkdirsSync: function() {},
      writeFileSync: function(outputPath, data) {
        assert.ok(data.match(AuthId));
        assert.ok(data.match(Token));
        assert.equal(outputPath, path.join(process.env.APPDATA, 'Leap Motion', 'tt.xml'));
        done();
      }
    }));

    drm.writeXml(AuthId, Token);
  });

  it('should write auth.plist on OS X', function(done) {
    process.env.HOME = process.env.HOME || '';

    var drm = rewire('../../../app/utils/drm.js');

    drm.__set__('os', _(require('os')).extend({
      platform: function() {
        return 'darwin';
      }
    }));

    drm.__set__('fs', _(require('fs-extra')).extend({
      mkdirsSync: function() {},
      writeFileSync: function(outputPath, data) {
        assert.ok(data.match(AuthId));
        assert.ok(data.match(Token));
        assert.equal(outputPath, path.join(process.env.HOME, 'Library', 'Preferences', 'DSS', 'auth.plist'));
        done();
      }
    }));

    drm.writeXml(AuthId, Token);
  });
});

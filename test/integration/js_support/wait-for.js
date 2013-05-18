var DEFAULT_MAX_DURATION = 6000;

(function() {
  window.waitFor = function(title, checkFnOrCssSelector, opts) {
    var defer = jQuery.Deferred();
    opts = opts || {};
    var checkFn = _.isFunction(checkFnOrCssSelector) ? checkFnOrCssSelector : function() {
      return $(checkFnOrCssSelector).length;
    };
    var startTime = new Date().getTime();
    var maxDuration = opts.maxDuration || DEFAULT_MAX_DURATION;
    var pollInterval = opts.pollInterval || 200;
    var pollFn = function() {
      var now = new Date().getTime();
      if (now > startTime + maxDuration) {
        console.log('waitFor "' + title + '" did not complete in ' + maxDuration + ' ms');
        defer.reject();
        failTest('waitFor "' + title + '" did not complete in ' + maxDuration + ' ms');
      } else {
        try {
          var isReady = checkFn();
        } catch (err) {
          failTest('ERROR. waitFor "' + title + '" WAIT function has an error: ' + err.message);
        }
        if (isReady) {
          console.log('Wait on "' + title + '" completed in ' + (now - startTime) + ' ms');
          try {
            setTimeout(function() { // so we can be a little sloppy in the checkFn
              defer.resolve();
            }, 50);
          } catch (err) {
            failTest('ERROR. waitFor "' + title + '" RESOLUTION function has an error: ' + err.message);
          }
        } else {
          window.setTimeout(pollFn, pollInterval);
        }
      }
    };
    console.log('Waiting for "' + title + '"');
    pollFn();
    return defer.promise();
  };

  function failTest(msg) {
    console.log(msg);
    assert.ok(false, msg);
    // done()?
  }
})();

(function() {
  var DEFAULT_MAX_DURATION = 1500;

  window.waitFor = function(title, checkFnOrCssSelector, mochaDone, opts, cb) {
    opts = opts || {};
    if (_.isFunction(opts)) {
      cb = opts;
      opts = {};
    }
    var checkFn = _.isFunction(checkFnOrCssSelector) ? checkFnOrCssSelector : function() {
      if (checkFnOrCssSelector.charAt(0) === '!') {
        return !$(checkFnOrCssSelector.substring(1)).length;
      } else {
        return $(checkFnOrCssSelector).length;
      }
    };
    var startTime = new Date().getTime();
    var maxDuration = opts.maxDuration || global.WaitForMaxDuration || DEFAULT_MAX_DURATION;
    var pollInterval = opts.pollInterval || 50;
    var pollFn = function() {
      var now = new Date().getTime();
      if (now > startTime + maxDuration) {
        console.log('waitFor "' + title + '" did not complete in ' + maxDuration + ' ms');
        failTest(mochaDone, new Error('waitFor "' + title + '" did not complete in ' + maxDuration + ' ms'));
      } else {
        try {
          var isReady = checkFn();
        } catch (err) {
          failTest(mochaDone, new Error('waitFor "' + title + '" WAIT function has an error: ' + err.message));
        }
        if (isReady) {
          console.log('Wait on "' + title + '" completed in ' + (now - startTime) + ' ms');
          setTimeout(function() {
            try {
              cb();
            } catch (err) {
              failTest(mochaDone, err);
            }
          }, 5);
        } else {
          window.setTimeout(pollFn, pollInterval);
        }
      }
    };

    console.log('Waiting for "' + title + '"');
    pollFn();
  };

  function failTest(done, err) {
    done(err);
  }

})();

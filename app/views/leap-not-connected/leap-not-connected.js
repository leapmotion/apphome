// This looks so wrong but it feels soooo right! Seriously, this allows us to override required includes, e.g. leap.js
require = require('../../utils/wraprequire.js')(module);

var config = require('../../../config/config.js');
var i18n = require('../../utils/i18n.js');
var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'leap-not-connected',

  initialize: function() {
    this.injectCss();
    this.$el.toggleClass('embedded', !!this.options.isEmbedded);
    this.$el.append(this.templateHtml({
      skipButton_label: i18n.translate('Continue with mouse only')
    }));
  },

  encourageConnectingLeap: function(cb) {
    if (!leap.isConnected()) {
      this.$el.appendTo('body');
      var checkInterval = setInterval(function() {
        if (leap.isConnected()) {
          clearInterval(checkInterval);
          cb && cb(null);
        }
      });
      this.$('.skip-button').click(function() {
        clearInterval(checkInterval);
        cb && cb(null);
      });
    } else {
      cb && cb(null);
    }
  }

});

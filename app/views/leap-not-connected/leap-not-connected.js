var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'leap-not-connected',

  initialize: function() {
    console.log('tmp --- init');
    this.injectCss();
    this.$el.toggleClass('embedded', !!this.options.isEmbedded);
    this.$el.append($(this.templateHtml()));
  },

  encourageConnectingLeap: function(cb) {
    if (!leap.isConnected()) {
      console.log('tmp --- encourageConnectingLeap');
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

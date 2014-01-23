var i18n = require('../../../utils/i18n.js');

var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('About Airspace Home'),
    width: 300,
    height: 160,
    'always-on-top': false,
    show: false
  },

  initialize: function(options) {
    _extend(this.options, options);

    this.injectCss();
    this.$el.append(this.templateHtml({
      appName: i18n.translate(uiGlobals.appName),
      appVersion: uiGlobals.appVersion
    }));
    this.options.nwWindow.show();
  }

});

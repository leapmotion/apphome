var markdown = require('markdown').markdown;

var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function() {
    var leapApp = this.options.leapApp;

    this.injectCss();
    var appJson = leapApp.toJSON();
    if (appJson.changelog) {
      try {
        appJson.changelog = appJson.changelog.replace(/<\s*br\s*\/?\s*>/g, '');
        appJson.changelog = markdown.renderJsonML(markdown.toHTMLTree(markdown.parse(appJson.changelog)));
      } catch (e) {
        // ignore markdown parsing errors
      }
    }
    this.$el.append($(this.templateHtml({ app: appJson })));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon(true);
      }
    }.bind(this));

    this.$('.button.cancel').click(function() {
      if (_.isFunction(this.options.onCancel)) {
        this.options.onCancel();
      }
      this.remove();
    }.bind(this));
    this.$('.button.confirm').hide().click(this.options.onConfirm);
    if (leapApp.isUpgrade()) {
      this.$('.button.confirm.upgrade').show();
    } else {
      this.$('.button.confirm.install').show();
    }

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
    }.bind(this));
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    this.$el.remove();
  }

});

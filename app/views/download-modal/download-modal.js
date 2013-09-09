var leap = require('../../utils/leap.js');

var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function() {

    var leapApp = this.options.leapApp;
    var appToInstall = leapApp;

    var appJson = leapApp.toJSON();
    appJson.changelog = leapApp.getMarkdown('changelog');
    appJson.description = leapApp.getMarkdown('description');

    if (leapApp.isUpgradable()) {
      var upgradeApp = leapApp.get('availableUpgrade');
      if (_.isFunction(upgradeApp.toJSON)) {
        _(appJson).extend(upgradeApp.toJSON());
        appJson.changelog = upgradeApp.getMarkdown('changelog');
      }
    }
    this.$el.append($(this.templateHtml({ app: appJson })));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon();
      }
    }.bind(this));

    this.$('.button.confirm').hide().click(this.options.onConfirm);
    this.$('.button.launch').hide().click(this.options.onLaunch);
    if (leapApp.isUpgradable()) {
      this.$('.button.launch').show();
      this.$('.button.confirm.upgrade').show();
    } else {
      this.$('.button.confirm.install').show();
    }

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
    }.bind(this));
  }

});

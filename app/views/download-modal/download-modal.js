var i18n = require('../../utils/i18n.js');

var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function() {
    this.initializeModal();

    var leapApp = this.options.leapApp;

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
    this.$el.append(this.templateHtml({
      app:               appJson,
      version_label:     i18n.translate('Version'),
      releaseDate_label: i18n.translate('Release Date'),
      changelog_label:   i18n.translate("What's New"),
      description_label: i18n.translate('Description'),
      cancel_label:      i18n.translate('Cancel'),
      install_label:     i18n.translate('Install %1$s').fetch(appJson.name),
      upgrade_label:     i18n.translate('Update App'),
      launch_label:      i18n.translate('Launch App')
    }));

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

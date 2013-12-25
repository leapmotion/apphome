var i18n = require('../../utils/i18n.js');

var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function(options) {
    this.options = options;

    this.initializeModal();

    var leapApp = this.options.leapApp;

    var appJson = leapApp.toJSON();
    appJson.changelog = leapApp.getMarkdown('changelog');
    appJson.description = leapApp.getMarkdown('description');

    if (leapApp.isUpdatable()) {
      var updateApp = leapApp.get('availableUpdate');
      if (_.isFunction(updateApp.toJSON)) {
        _(appJson).extend(updateApp.toJSON());
        appJson.changelog = updateApp.getMarkdown('changelog');
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
      update_label:      i18n.translate('Update App'),
      launch_label:      i18n.translate('Launch App')
    }));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon();
      }
    }.bind(this));

    if (!window.navigator.onLine) {
      this.$('.confirm').addClass('disabled')
        .attr('title', i18n.translate('No internet connection'));
    } else {
      this.$('.confirm').click(this.options.onConfirm);
    }

    this.$('.button.confirm').hide();
    this.$('.button.launch').hide().click(this.options.onLaunch);
    if (leapApp.isUpdatable()) {
      this.$('.button.launch').show();
      this.$('.button.confirm.update').show();
    } else {
      this.$('.button.confirm.install').show();
    }

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
    }.bind(this));
  },

  show: function() {
    Modal.prototype.show.bind(this)();

    this.$('.button.confirm.install').css({
      'max-width': this.$('.footer').innerWidth() - this.$('.button.cancel').outerWidth() - 50
    });
  }

});

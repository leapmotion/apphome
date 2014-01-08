var os = require('os');

var config = require('../../../config/config.js');
var db = require('../../utils/db.js');
var i18n = require('../../utils/i18n.js');

var BaseView = require('../base-view.js');

var NotificationView = BaseView.extend({

  viewDir: __dirname,

  initialize: function(notification) {
    this.injectCss();

    this.notification = notification;

    this.setElement(this.templateHtml({
      message: notification.get('body'),
      iconUrl: notification.get('icon_url')
    }));

    this.$('.dismiss').click(function(evt) {
      console.log('Dismissing notification ' + this.uuid);
      this.dismiss();
      evt.stopPropagation();
    }.bind(this));

    this.$el.click(function() {
      nwGui.Shell.openExternal(notification.get('url'));
    }.bind(this));
  },

  dismiss: function() {
    var dismissedNotifications = db.fetchObj(config.DbKeys.DismissedNotifications) || [];
    dismissedNotifications.push(this.notification.get('uuid'));
    db.saveObj(config.DbKeys.DismissedNotifications, dismissedNotifications);
    this.trigger('dismissed');
    this.$el.remove();
  }
});

module.exports = NotificationView;

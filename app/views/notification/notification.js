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
      iconUrl: notification.get('icon').url
    }));

    this.$('.dismiss').click(function() {
      this.dismiss();
    }.bind(this));
  },

  dismiss: function() {
    var dismissedNotifications = db.fetchObj(config.DbKeys.DismissedNotifications) || [];
    dismissedNotifications.push(this.notification.get('id'));
    db.saveObj(config.DbKeys.DismissedNotifications, dismissedNotifications);
  }
});

module.exports = NotificationView;

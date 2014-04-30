var os = require('os');

var config = require('../../../config/config.js');
var db = require('../../utils/db.js');
var i18n = require('../../utils/i18n.js');
var ga = require('../../utils/ga.js');

var BaseView = require('../base-view.js');

var NotificationView = BaseView.extend({

  viewDir: __dirname,

  initialize: function(notification) {
    this.injectCss();

    this.notification = notification;

    this.setElement(this.templateHtml({
      uuid: notification.get('uuid'),
      message: notification.get('body'),
      iconUrl: notification.get('icon_url'),
      link: !!notification.get('url')
    }));

    this.$('.dismiss').click(function(evt) {
      console.log('Dismissing notification ' + this.uuid);
      this.dismiss();
      evt.stopPropagation();
    }.bind(this));

    this.$el.click(function() {
      ga.trackEvent('notifications/'+ notification.get('uuid') +'/click');
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

var config = require('../../../config/config.js');

var i18n = require('../../utils/i18n.js');
var db = require('../../utils/db.js');
var pubnub = require('../../utils/pubnub.js');

var Notification = require('../../models/notification.js');

var BaseView = require('../base-view.js');
var NotificationView = require('../notification/notification.js');

var NotificationPane = BaseView.extend({
  viewDir: __dirname,

  notifications: [],

  initialize: function(args) {
    args = args || {};
    this.injectCss();
    this.$el.append(this.templateHtml({
      notification_title: i18n.translate('Notifications'),
      no_notifications: i18n.translate('No notifications to display')
    }));

    this.$('.notification-trigger').click(this.toggle.bind(this));

    this.subscribeToNotifications();

    uiGlobals.on(uiGlobals.Event.SignIn, function(user) {
      this.subscribeToUserNotifications(user.user_id);
    }.bind(this));
  },

  toggle: function() {
    if (this.$('.notifications').is(':visible')) {
      this.$('.notifications').hide();
    } else {
      this.show();
    }
  },

  show: function() {
    db.saveObj(config.DbKeys.ViewedNotifications, _.pluck(this.notifications, 'id'));
    this.notifications.forEach(function(notification) {
      notification.set('new', false);
    });

    this.$('.notifications').show();

    this.updateBadgeCount();
  },

  subscribeToNotifications: function() {
    var _this = this;
    pubnub.history(10, 'notification.' + uiGlobals.locale.toLowerCase(), function(notifications, start, end) {
      notifications.forEach(function(notification, i, arr) {
        if (_.isObject(notification) && ('id' in notification)) {
          _this.displayNotification(notification);
        } else {
          console.log("id not present in notification: " + notification);
        }
      });
    });

    pubnub.subscribe('notification.' + uiGlobals.locale.toLowerCase(), function(notification) {
      _this.displayNotification(notification);
    });
  },

  subscribeToUserNotifications: function(userId) {
    var _this = this;
    pubnub.history(10, userId + '.user.notification.' + uiGlobals.locale.toLowerCase(), function(notifications, start, end) {
      notifications.forEach(_this.displayNotification);
    });

    pubnub.subscribe(userId + '.user.notifications.' + uiGlobals.locale.toLowerCase(), function(notification) {
      _this.displayNotification(notification);
    });
  },

  displayNotification: function(notificationJson) {
    // Just don't even process dismissed notifications
    var dismissedNotifications = db.fetchObj(config.DbKeys.DismissedNotifications) || [];
    if (dismissedNotifications.indexOf(notificationJson.id) !== -1) {
      console.log('Skipping dismissed notification: ' + JSON.stringify(notificationJson));
      return;
    }

    var notification = new Notification(notificationJson);
    this.notifications.push(notification);

    var notificationView = new NotificationView(notification);
    this.$('.notifications').append(notificationView.$el);

    this.showOrHideEmpty();
    this.updateBadgeCount();
  },

  showOrHideEmpty: function() {
    if (this.notifications.length > 0) {
      this.$('.empty').hide();
    } else {
      this.$('.empty').show();
    }
  },

  updateBadgeCount: function() {
    this.$('.count').text(_.where(this.notifications, {"new": true}));
  }

});

module.exports = NotificationPane;

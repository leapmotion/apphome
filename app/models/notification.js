var config = require('../../config/config.js');
var db = require('../utils/db.js');

var BaseModel = require('./base-model.js');

var Notification = BaseModel.extend({
  initialize: function() {
    var viewedNotifications = db.fetchObj(config.DbKeys.ViewedNotifications) || [];
    if (viewedNotifications.indexOf(this.get('uuid')) == -1) {
      this.set('new', true);
    }
  }
});

module.exports = Notification;

var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    width: 640,
    height: 480,
    frame: true,
    resizable: true,
    show: false,
    x: 50,
    y: 50
  },

  initialize: function() {
    var doc = this.$el.prop('ownerDocument');
    doc.location = this.options.href;
    this.options.nwWindow.show();
  }

});




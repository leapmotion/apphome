var BaseView = require('../base-view.js');
var childProcess = require('child_process');

var BaseTile = BaseView.extend({

  _common: function(args) {

  },

  initLauncher: function(path) {
    var $el = this.$el;
    $el.click(function() {
      if ($el.hasClass('launching')) {
        return;
      }
      $el.addClass('launching');  // todo: remove when node-webkit blur fires
      childProcess.exec("open '" + path + "'");
    }.bind(this));
  }

});


module.exports = BaseTile;

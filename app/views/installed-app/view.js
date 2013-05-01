var BaseView = require('../base-view.js');
var childProcess = require('child_process');

module.exports = BaseView.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    this.setElement($(this.templateHtml(args)));

    this._initLauncher(args.path);
  },

  _initLauncher: function(path) {
    var itself = this;
    var $el = itself.$el;
    itself.$el.click(function() {
      if ($el.hasClass('launching')) {
        return;
      }
      $el.addClass('launching');  // todo: remove when node-webkit blur fires
      childProcess.exec("open '" + path + "'");
    });

  }

});


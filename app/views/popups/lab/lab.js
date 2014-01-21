var i18n = require('../../../utils/i18n.js');
var db = require('../utils/db.js');
var urlify = require('django-urlify');

var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('Airspace Labs'),
    width: 300,
    height: 400,
    'always-on-top': false,
    show: false
  },

  initialize: function(options) {
    _extend(this.options, options);

    var labOptions = _.pairs(uiGlobals.labOptions).map(function(option) {
      option.push(urlify(option[0]));
    });

    this.injectCss();
    this.$el.append(this.templateHtml({
      instructions: i18n.translate("These are experimental features which may crash Airspace Home.  Enable at your own risk.  You will need to restart Airspace before your changes take effect."),
      labOptions: labOptions,
    }));

    labOptions.forEach(function(option) {
      if (option[1]) {
        this.$el.find("input." + option[2]).attr('checked', 'true');
      }
    }.bind(this));

    this.options.nwWindow.show();
  }

});

var i18n = require('../../../utils/i18n.js');
var db = require('../../../utils/db.js');
var urlify = require('django-urlify');

var config = require('../../../../config/config.js');
var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('Airspace Labs'),
    width: 640,
    height: 480,
    'always-on-top': false,
    show: false
  },

  initialize: function(options) {
    _.extend(this.options, options);

    var labOptions = _.pairs(uiGlobals.labOptions);

    labOptions.map(function(option) {
      option.push(urlify(option[0]));
    });

    this.injectCss();
    this.$el.append(this.templateHtml({
      instructions: i18n.translate("These are experimental features which may crash Airspace Home. Enable at your own risk. You will need to restart Airspace before your changes take effect."),
      options: labOptions,
      save_label: i18n.translate('Save'),
    }));

    labOptions.forEach(function(option) {
      if (option[1]) {
        this.$el.find("input." + option[2]).prop('checked', 'checked');
      }
    }.bind(this));

    this.$el.find('form').submit(function(evt) {
      var updatedOptions = {};

      this.$el.find('input[type="checkbox"]').each(function() {
        updatedOptions[$(this).data('option')] = $(this).prop('checked');
      });

      console.log("Saved:", updatedOptions);
      db.saveObj(config.DbKeys.LabOptionStates, updatedOptions);

      evt.preventDefault();
    }.bind(this));

    this.options.nwWindow.show();
  }

});

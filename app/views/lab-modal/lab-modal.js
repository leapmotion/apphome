
var urlify = require('django-urlify');

var i18n = require('../../utils/i18n.js');
var db = require('../../utils/db.js');
var mixpanel = require('../../utils/mixpanel.js');

var config = require('../../../config/config.js');

var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'lab-modal',

  initialize: function(options) {
    this.options = _.extend({}, options);

    this.initializeModal();

    var labOptions = _.pairs(_.extend(uiGlobals.labOptions, uiGlobals.newLabOptions));

    labOptions.map(function(option) {
      // Get and translate description to display
      option.push(i18n.translate(config.LabOptions[option[0]]));
    });

    this.$el.append(this.templateHtml({
      title: i18n.translate('Welcome to Airspace Labs'),
      intro: i18n.translate('Customize your Airspace experience by trying out these features!'),
      instructions: i18n.translate("These are experimental features which may crash Airspace Home. "
       + "Enable at your own risk. You will need to restart Airspace before your changes take effect."),
      options: labOptions,
      restart_label: i18n.translate('Please restart Airspace Home to see your changes'),
      save_label: i18n.translate('Save'),
      saved_label: i18n.translate('Saved'),
      cancel_label: i18n.translate('Cancel')
    }));

    if (_.keys(uiGlobals.newLabOptions).length) {
      this.$('.restart-notification').show();
    }

    labOptions.forEach(function(option) {
      if (option[1]) {
        this.$el.find("input." + option[0]).prop('checked', 'checked');
      }
    }.bind(this));

    this.$('form').submit(function(evt) {
      evt.preventDefault();
    });

    this.$('.save').click(function(evt) {
      var updatedOptions = {};

      this.$('input[type="checkbox"]').each(function() {
        var option = $(this).attr('class'), value = !!$(this).prop('checked');
        updatedOptions[option] = value;
      });

      console.log("Saved:", updatedOptions);

      uiGlobals.newLabOptions = updatedOptions;
      db.saveObj(config.DbKeys.PreviousLabOptionStates, uiGlobals.labOptions);
      db.saveObj(config.DbKeys.LabOptionStates, updatedOptions);

      // this.$('.saved').show().delay(150).fadeOut('slow');
      this.$('.restart-notification').show();
    }.bind(this));
  },

  showRestartMessage: function() {
    var rn = this.$('.restart-notification');
    rn.show();
    if (rn.height() < 50) {
      var lastWidth;
      while (rn.height() < 50) {

      }
    } else {

    }
  }

});

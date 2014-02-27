var i18n = require('../../utils/i18n.js');
var db = require('../../utils/db.js');
var urlify = require('django-urlify');

var config = require('../../../config/config.js');

var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'lab-modal',

  initialize: function(options) {
    this.options = _.extend({}, options);

    this.initializeModal();

    var labOptions;
    if (uiGlobals.newLabOptions) {
      labOptions = _.pairs(uiGlobals.newLabOptions);
    } else {
      labOptions = _.pairs(uiGlobals.labOptions);
    }

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
      save_label: i18n.translate('Save'),
      saved_label: i18n.translate('Saved'),
      cancel_label: i18n.translate('Cancel')
    }));

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
        updatedOptions[$(this).attr('class')] = $(this).prop('checked');
      });

      console.log("Saved:", updatedOptions);
      uiGlobals.newLabOptions = updatedOptions;
      db.saveObj(config.DbKeys.LabOptionStates, updatedOptions);

      this.$('.saved').show().delay(150).fadeOut('slow');
    }.bind(this));
  }

});

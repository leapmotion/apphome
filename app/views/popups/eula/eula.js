var fs = require('fs');
var path = require('path');

var i18n = require('../../../utils/i18n.js');

var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('Leap Motion End User Software License Agreement'),
    width: 640,
    height: 480,
    frame: true,
    resizable: true,
    show: false,
    x: 50,
    y: 50,
    openLinksInternally: true
  },

  initialize: function() {
    // Kinda gross, but what the hell...
    var licenseDir = path.join(__dirname, '..', '..', '..', '..', 'static', 'licenses');
    var licenseFile = 'license-' + i18n.locale + '.html';
    if (!fs.existsSync(path.join(licenseDir, licenseFile))) {
      console.warn('Missing EULA file for locale: ' + i18n.locale);
      licenseFile = 'license-en.html';
    }
    var doc = this.$el.prop('ownerDocument');
    doc.write(fs.readFileSync(path.join(licenseDir, licenseFile), 'utf-8'));
    doc.title = this.options.title;
    this.options.nwWindow.show();
  }

});

var fs = require('fs');
var path = require('path');
var stylus = require('stylus');
var jade = require('jade');

var injectedCssFiles = {};

module.exports = window.Backbone.View.extend({

  injectCss: function() {
    if (!this.viewDir) {
      throw new Error('this.viewDir not set');
    }
    var cssPath = path.join(this.viewDir, path.basename(this.viewDir) + '.stylus');
    if (!injectedCssFiles[cssPath]) {
      injectedCssFiles[cssPath] = true;
      var src = fs.readFileSync(cssPath, 'utf8');
      stylus.render(src, { filename: cssPath }, function(err, css){
        if (err) {
          throw err;
        } else {
          $('head').append('<style>\n' + css + '\n</style>');
        }
      });
    }
  },

  templateHtml: function(data, jadeOpts) {
    if (!this.viewDir) {
      throw new Error('this.viewDir not set');
    }
    if (!this.templateFn) {
      var templatePath = path.join(this.viewDir, path.basename(this.viewDir) + '.jade');
      var src = fs.readFileSync(templatePath, 'utf8');
      this.templateFn = jade.compile(src, jadeOpts || {});
    }
    return this.templateFn(data);
  }

});

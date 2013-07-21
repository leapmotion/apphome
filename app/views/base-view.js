var fs = require('fs');
var path = require('path');
var stylus = require('stylus');
var jade = require('jade');
var domInjection = require('../utils/dom-injection.js');

var templateCache = {};

var BaseView = window.Backbone.View.extend({

  injectCss: function() {
    this._requireViewDir();
    var cssPath = path.join(this.viewDir, path.basename(this.viewDir) + '.stylus');
    domInjection.applyStylus(cssPath);
  },

  templateHtml: function(data, jadeOpts) {
    this._requireViewDir();
    if (!this.templateFn) {
      var templatePath = path.join(this.viewDir, path.basename(this.viewDir) + '.jade');
      var src = templateCache[templatePath];
      if (!src) {
        src = fs.readFileSync(templatePath, 'utf8');
        templateCache[templatePath] = src;
      }
      this.templateFn = jade.compile(src, jadeOpts || {});
    }
    return this.templateFn(data);
  },

  dirSrc: function() {
    this._requireViewDir();
    return './' + path.relative(global.LeapHomeDir, this.viewDir);
  },

  _requireViewDir: function() {
    if (!this.viewDir) {
      throw new Error('this.viewDir not set');
    }
  }

});

module.exports = BaseView;

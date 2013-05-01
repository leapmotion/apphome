var fs = require('fs');
var stylus = require('stylus');
var jade = require('jade');

var cssRegistry = {};

module.exports = window.Backbone.View.extend({

  injectCss: function() {
    var dir = this.viewDir;
    if (dir && !cssRegistry[dir]) {
      cssRegistry[dir] = true;
      var path = dir + '/' + 'style.stylus';
      var src = fs.readFileSync(path, 'utf8');
      stylus.render(src, { filename: path }, function(err, css){
        if (err) {
          throw err;
        } else {
          $('head').append('<style>\n' + css + '\n</style>');
        }
      });
    }
  },

  templateHtml: function(data, jadeOpts) {
    if (!this.templateFn) {
      var path = this.viewDir + '/' + 'template.jade';
      var src = fs.readFileSync(path, 'utf8');
      this.templateFn = jade.compile(src, jadeOpts || {});
    }
    if (!this.templateFn) {
      throw new Error('template.jade not found in view directory: ' + this.viewDir);
    }
    return this.templateFn(data);
  }
});
var path = require('path');

var overriddenModules = {};

function wraprequire(wrappedModule) {
  // console.log('wraprequire', wrappedModule);
  return function(modulepath) {
    var abspath = path.resolve(path.dirname(wrappedModule.id), modulepath);
    if (overriddenModules[abspath]) {
      console.log('overriding required module', abspath, 'with', overriddenModules[abspath]);
    }
    return wrappedModule.require(overriddenModules[abspath] || abspath);
  };
}

function overrideModule(from, to, contextmodule) {
  var absfrom = path.resolve(path.dirname(contextmodule.id), from);
  var absto = path.resolve(path.dirname(contextmodule.id), to);
  // console.log('overrideModule', absfrom, absto);
  overriddenModules[absfrom] = absto;
}

module.exports = wraprequire;
module.exports.override = overrideModule;
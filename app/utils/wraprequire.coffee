path = require("path")

overriddenModules = {}

wraprequire = (wrappedModule) ->
  # console.log('wraprequire', wrappedModule);
  (modulepath) ->
    abspath = path.resolve(path.dirname(wrappedModule.id), modulepath)
    console.log "overriding required module", abspath, "with", overriddenModules[abspath]  if overriddenModules[abspath]
    wrappedModule.require overriddenModules[abspath] or abspath
overrideModule = (from, to, contextmodule) ->
  absfrom = path.resolve(path.dirname(contextmodule.id), from)
  absto = path.resolve(path.dirname(contextmodule.id), to)

  # console.log('overrideModule', absfrom, absto);
  overriddenModules[absfrom] = absto

module.exports = wraprequire
module.exports.override = overrideModule

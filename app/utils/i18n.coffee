exec = require("child_process").exec
fs = require("fs")
os = require("os")
path = require("path")
po2json = require("po2json")
Jed = require("jed")
registry = require("./registry.js")
shell = require("./shell.js")

DefaultLocale = "en"

module.exports.locale = process.env.LEAPHOME_LOCALE

sanitizeLocale = (fullLocale, cb) ->
  fullLocale = (fullLocale or DefaultLocale).toLowerCase()
  if supportedLanguages.indexOf(fullLocale) isnt -1
    locale = fullLocale
  else if /zh.hk|zh.mo/i.test(fullLocale)
    locale = "zh-tw" # zh-HK and zh-MO should fall back to traditional Chinese.
  else if fullLocale.indexOf("zh") is 0
    locale = "zh-cn"
  else
    locale = fullLocale.split("-").shift()
  locale = DefaultLocale  if supportedLanguages.indexOf(locale) is -1
  module.exports.locale = locale
  cb?(null, locale)

getWindowsLocale = (cb) ->
  registry.readValue "HKCU\\Control Panel\\Desktop", "PreferredUILanguages", (err, fullLocale) ->
    if err
      console.warn err.stack or err
      cb?(null, DefaultLocale)
    else
      if fullLocale
        sanitizeLocale fullLocale, cb
      else
        registry.readValue "HKCU\\Control Panel\\Desktop\\MuiCached", "MachinePreferredUILanguages", (err, fullLocale) ->
          if err
            console.warn err.stack or err
            cb?(null, DefaultLocale)
          else
            if fullLocale
              sanitizeLocale fullLocale, cb
            else
              cb?(null, DefaultLocale)


getOSXLocale = (supportedLanguages, cb) ->
  # This is only ok because we're just copying, not zipping up the app, so permissions are preserved
  # If we want to zip this up again, we'll need to chmod it to executable
  executable = path.join(__dirname, "..", "..", "bin", "PreferredLocalization")
  command = shell.escape(executable) + " " + supportedLanguages.join(" ").replace(/-/g, "_")
  exec command, (err, stdout) ->
    if err
      console.warn err.stack or err
      cb?(null, DefaultLocale)
    else
      locale = module.exports.locale = window.$.trim(stdout).replace("_", "-") or DefaultLocale
      cb?(null, locale)

getLocale = (cb) ->
  locale = module.exports.locale
  unless locale
    supportedLanguages = Array()
    supportedLanguages.push DefaultLocale

    poFileNames = fs.readdirSync(path.join(__dirname, "..", "..", "config", "locales"))
    for poFileName in poFileNames
      langMatch = poFileName.match(/(.*)\.po/i)
      supportedLanguages.push langMatch[1].toLowerCase()  if langMatch

    console.log "Supported languages: " + supportedLanguages

    if os.platform() is "win32"
      getWindowsLocale cb
    else if os.platform() is "darwin"
      getOSXLocale supportedLanguages, cb
    else
      locale = module.exports.locale = "en"
      cb?(null, locale)
  else
    cb?(null, locale)

poFileForLocale = (locale) ->
  poFile = path.join(__dirname, "../../config/locales", locale + ".po")
  if fs.existsSync(poFile)
    poFile
  else
    if locale is DefaultLocale
      throw new Error(".po file for default locale (" + DefaultLocale + ") is missing.")
    else
      poFileForLocale DefaultLocale

i18n = undefined
initialize = (cb) ->
  getLocale (err, locale) ->
    return cb?(err)  if err

    uiGlobals.locale = locale

    localeData = undefined
    try
      localeData = po2json.parseSync(poFileForLocale(locale))
    catch err2
      return cb?(err2)
    i18n = new Jed(
      domain: locale
      missing_key_callback: (key) ->
        console.warn "Missing translation key: \"" + key + "\" for locale: " + locale

      locale_data: localeData
    )
    cb?(null, locale)

translate = (str) ->
  if i18n
    translation = i18n.translate $.trim str.toLowerCase()
    translation.toString = translation.fetch
    translation
  else
    err = new Error("i18n must be initialized before use.")
    console.warn err.stack or err
    throw err

module.exports.initialize = initialize
module.exports.translate = translate

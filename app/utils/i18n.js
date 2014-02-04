// Generated by CoffeeScript 1.6.3
(function() {
  var DefaultLocale, Jed, exec, fs, getLocale, getOSXLocale, getWindowsLocale, i18n, initialize, os, path, po2json, poFileForLocale, registry, sanitizeLocale, shell, translate;

  exec = require("child_process").exec;

  fs = require("fs");

  os = require("os");

  path = require("path");

  po2json = require("po2json");

  Jed = require("jed");

  registry = require("./registry.js");

  shell = require("./shell.js");

  DefaultLocale = "en";

  module.exports.locale = process.env.LEAPHOME_LOCALE;

  sanitizeLocale = function(fullLocale, supportedLanguages, cb) {
    var locale;
    fullLocale = (fullLocale || DefaultLocale).toLowerCase();
    if (supportedLanguages.indexOf(fullLocale) !== -1) {
      locale = fullLocale;
    } else if (/zh.hk|zh.mo/i.test(fullLocale)) {
      locale = "zh-tw";
    } else if (fullLocale.indexOf("zh") === 0) {
      locale = "zh-cn";
    } else {
      locale = fullLocale.split("-").shift();
    }
    if (supportedLanguages.indexOf(locale) === -1) {
      locale = DefaultLocale;
    }
    module.exports.locale = locale;
    return typeof cb === "function" ? cb(null, locale) : void 0;
  };

  getWindowsLocale = function(supportedLanguages, cb) {
    return registry.readValue("HKCU\\Control Panel\\Desktop", "PreferredUILanguages", function(err, fullLocale) {
      if (err) {
        console.warn(err.stack || err);
        return typeof cb === "function" ? cb(null, DefaultLocale) : void 0;
      } else {
        if (fullLocale) {
          return sanitizeLocale(fullLocale, supportedLanguages, cb);
        } else {
          return registry.readValue("HKCU\\Control Panel\\Desktop\\MuiCached", "MachinePreferredUILanguages", function(err, fullLocale) {
            if (err) {
              console.warn(err.stack || err);
              return typeof cb === "function" ? cb(null, DefaultLocale) : void 0;
            } else {
              if (fullLocale) {
                return sanitizeLocale(fullLocale, supportedLanguages, cb);
              } else {
                return typeof cb === "function" ? cb(null, DefaultLocale) : void 0;
              }
            }
          });
        }
      }
    });
  };

  getOSXLocale = function(supportedLanguages, cb) {
    var command, executable;
    executable = path.join(__dirname, "..", "..", "bin", "PreferredLocalization");
    command = shell.escape(executable) + " " + supportedLanguages.join(" ").replace(/-/g, "_");
    return exec(command, function(err, stdout) {
      var locale;
      if (err) {
        console.warn(err.stack || err);
        return typeof cb === "function" ? cb(null, DefaultLocale) : void 0;
      } else {
        locale = module.exports.locale = window.$.trim(stdout).replace("_", "-") || DefaultLocale;
        return typeof cb === "function" ? cb(null, locale) : void 0;
      }
    });
  };

  getLocale = function(cb) {
    var langMatch, locale, poFileName, poFileNames, supportedLanguages, _i, _len;
    locale = module.exports.locale;
    if (!locale) {
      supportedLanguages = Array();
      supportedLanguages.push(DefaultLocale);
      poFileNames = fs.readdirSync(path.join(__dirname, "..", "..", "config", "locales"));
      for (_i = 0, _len = poFileNames.length; _i < _len; _i++) {
        poFileName = poFileNames[_i];
        langMatch = poFileName.match(/(.*)\.po/i);
        if (langMatch) {
          supportedLanguages.push(langMatch[1].toLowerCase());
        }
      }
      console.log("Supported languages: " + supportedLanguages);
      if (os.platform() === "win32") {
        return getWindowsLocale(supportedLanguages, cb);
      } else if (os.platform() === "darwin") {
        return getOSXLocale(supportedLanguages, cb);
      } else {
        locale = module.exports.locale = "en";
        return typeof cb === "function" ? cb(null, locale) : void 0;
      }
    } else {
      return typeof cb === "function" ? cb(null, locale) : void 0;
    }
  };

  poFileForLocale = function(locale) {
    var poFile;
    poFile = path.join(__dirname, "../../config/locales", locale + ".po");
    if (fs.existsSync(poFile)) {
      return poFile;
    } else {
      if (locale === DefaultLocale) {
        throw new Error(".po file for default locale (" + DefaultLocale + ") is missing.");
      } else {
        return poFileForLocale(DefaultLocale);
      }
    }
  };

  i18n = void 0;

  initialize = function(cb) {
    return getLocale(function(err, locale) {
      var err2, localeData;
      if (err) {
        return typeof cb === "function" ? cb(err) : void 0;
      }
      uiGlobals.locale = locale;
      localeData = void 0;
      try {
        localeData = po2json.parseSync(poFileForLocale(locale));
      } catch (_error) {
        err2 = _error;
        return typeof cb === "function" ? cb(err2) : void 0;
      }
      i18n = new Jed({
        domain: locale,
        missing_key_callback: function(key) {
          return console.warn("Missing translation key: \"" + key + "\" for locale: " + locale);
        },
        locale_data: localeData
      });
      return typeof cb === "function" ? cb(null, locale) : void 0;
    });
  };

  translate = function(str) {
    var err, translation;
    if (i18n) {
      translation = i18n.translate($.trim(str.toLowerCase()));
      translation.toString = translation.fetch;
      return translation;
    } else {
      err = new Error("i18n must be initialized before use.");
      console.warn(err.stack || err);
      throw err;
    }
  };

  module.exports.initialize = initialize;

  module.exports.translate = translate;

}).call(this);

/*
//@ sourceMappingURL=i18n.map
*/

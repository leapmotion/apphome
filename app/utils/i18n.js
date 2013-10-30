var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');
var po2json = require('po2json');

var Jed = require('jed');

var registry = require('./registry.js');
var shell = require('./shell.js');

var DefaultLocale = 'en';

module.exports.locale = process.env.LEAPHOME_LOCALE;
function getLocale(cb) {
  var locale = module.exports.locale;
  if (!locale) {
    var supportedLanguages = Array();
    supportedLanguages.push(DefaultLocale);

    var poFileNames = fs.readdirSync(path.join(__dirname, '..', '..', 'config', 'locales'));
    for (var i = 0; i < poFileNames.length; i++) {
      var langMatch = poFileNames[i].match(/(.*)\.po/i);
      if (langMatch) {
        supportedLanguages.push(langMatch[1].toLowerCase());
      }
    }

    console.log('Supported languages: ' + supportedLanguages);

    if (os.platform() === 'win32') {
      function sanitizeLocale(fullLocale, cb) {
        fullLocale = fullLocale || DefaultLocale;

          if (supportedLanguages.indexOf(fullLocale) !== -1) {
            locale = fullLocale;
          } else if (/zh.hk|zh.mo/i.test(fullLocale)) {
            locale = 'zh-TW'; // zh-HK and zh-MO should fall back to traditional Chinese.
          } else if (fullLocale.indexOf('zh') === 0) {
            locale = 'zh-CN';
          } else {
            locale = module.exports.locale = fullLocale.split('-').shift();
          }

          if (supportedLanguages.indexOf(locale) === -1) {
            locale = module.exports.locale = DefaultLocale;
          }

          cb && cb(null, locale);
      }

      registry.readValue('HKCU\\Control Panel\\Desktop', 'PreferredUILanguages', function(err, fullLocale) {
        if (err) {
          console.warn(err.stack || err);
          cb && cb(null, DefaultLocale);
        } else {
          if (fullLocale) {
            sanitizeLocale(fullLocale, cb);
          } else {
            registry.readValue('HKCU\\Control Panel\\Desktop\\MuiCached', 'MachinePreferredUILanguages', function(err, fullLocale) {
              if (err) {
                console.warn(err.stack || err);
                cb && cb(null, DefaultLocale);
              } else {
                if (fullLocale) {
                  sanitizeLocale(fullLocale, cb);
                } else {
                  cb && cb(null, DefaultLocale);
                }
              }
            });
          }
        }
      });

    } else if (os.platform() === 'darwin') {
      // This is only ok because we're just copying, not zipping up the app, so permissions are preserved
      // If we want to zip this up again, we'll need to chmod it to executable
      var executable = path.join(__dirname, '..', '..', 'bin', 'PreferredLocalization');

      var command = shell.escape(executable) + ' ' + supportedLanguages.join(' ').replace(/-/g, '_');

      exec(command, function(err, stdout) {
        if (err) {
          console.warn(err.stack || err);
          cb && cb(null, DefaultLocale);
        } else {
          locale = module.exports.locale = window.$.trim(stdout).replace('_', '-') || DefaultLocale;
          cb && cb(null, locale);
        }
      });
    } else {
      locale = module.exports.locale = 'en';
      cb && cb(null, locale);
    }
  } else {
    cb && cb(null, locale);
  }
}

function poFileForLocale(locale) {
  var poFile = path.join(__dirname, '../../config/locales', locale + '.po');
  if (fs.existsSync(poFile)) {
    return poFile;
  } else {
    if (locale === DefaultLocale) {
      throw new Error('.po file for default locale (' + DefaultLocale + ') is missing.');
    } else {
      return poFileForLocale(DefaultLocale);
    }
  }
}

var i18n;
function initialize(cb) {
  getLocale(function(err, locale) {
    if (err) {
      return cb && cb(err);
    }
    var localeData;
    try {
      localeData = po2json.parseSync(poFileForLocale(locale));
    } catch(err2) {
      return cb && cb(err2);
    }

    i18n = new Jed({
      domain: locale,
      missing_key_callback: function(key) {
        console.warn('Missing translation key: "' + key + '" for locale: ' + locale);
      },
      locale_data: localeData
    });
    cb && cb(null, locale);
  });
}

function translate(str) {
  if (i18n) {
    var translation = i18n.translate(str);
    translation.toString = translation.fetch;
    return translation;
  } else {
    throw new Error('i18n must be initialized before use.');
  }
}

module.exports.initialize = initialize;
module.exports.translate = translate;

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
    if (os.platform() === 'win32') {
      registry.readValue('HKCU\\Control Panel\\International', 'LocaleName', function(err, fullLocale) {
        if (err) {
          console.warn(err.stack || err);
          cb && cb(null, DefaultLocale);
        } else {
          fullLocale = fullLocale || DefaultLocale;
          locale = module.exports.locale = fullLocale.split('-').shift();
          cb && cb(null, locale);
        }
      });
    } else if (os.platform() === 'darwin') {
      var supportedLanguages = Array();
      supportedLanguages.push(DefaultLocale);

      var poFileNames = fs.readdirSync(path.join(__dirname, '..', '..', 'config', 'locales'));
      for (var i = 0; i < poFileNames.length; i++) {
        var langMatch = poFileNames[i].match(/(.*).po/);
        if (langMatch) {
          supportedLanguages.push(langMatch[1]);
        }
      }

      console.log('Supported languages: ' + supportedLanguages);

      var executable = path.join(__dirname, '..', '..', 'bin', 'PreferredLocalization');

      try {
        fs.chmodSync(executable, 0755);
      } catch (err) {
        console.warn(err.stack || err);
        return cb && cb(null, DefaultLocale);
      }

      var command = shell.escape(executable) + ' ' + supportedLanguages.join(' ');

      exec(command, function(err, stdout) {
        if (err) {
          console.warn(err.stack || err);
          cb && cb(null, DefaultLocale);
        } else {
          locale = module.exports.locale = stdout.replace(/^\s+|\s+$/g, '') || DefaultLocale;
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

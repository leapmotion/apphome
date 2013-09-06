var async = require('async');
var os = require('os');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var popupWindow = require('../../utils/popup-window.js');
var embeddedLeap = require('../../utils/embedded-leap.js');
var db = require('../../utils/db.js');
var mixpanel = require('../../utils/mixpanel.js');
var config = require('../../../config/config.js');
var shell = require('../../utils/shell.js');

var StaticHtmlPrefix = '/static/popups/first-run';

var PlatformOrientationPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
  darwin: '/Applications/Leap Motion Orientation.app'
};

var firstRunSplash;
var isEmbeddedLeap;
var systemLang = 'en';

var FirstRunSequence = {
  embeddedLeapCheck: function(cb) {
    embeddedLeap.embeddedLeapPromise().done(function(isEmbedded) {
      isEmbeddedLeap = isEmbedded;
      cb && cb(null);
    });
  },

  showFirstRunSplash: function(cb) {
    var readLocale = function(err, stdout, stderr) {
      var language = window.navigator.language;
      console.log('node-webkit reports language: ' + window.navigator.language);
      if (err) {
        console.log('Caught error: ' + err);
      }
      else {
        var lines = stdout.split('\n');
        if (lines.length >= 2) {
          // Parse PowerShell output to obtain the language Name e.g. en-US or fr-FR
          language = lines[0].replace(/\s/, ''); // trim CRLF
          console.log('Identified language from system query: ' + language);
        }
      }
      language = language.split('-')[0];
      console.log('Abbreviated language name: ' + language);
      systemLang = ((language == '') ? 'en' : language);
      var staticHtml = StaticHtmlPrefix + (language === 'en' ? '' : '-' + language) + '.html';
      var fullStaticHtmlPath = path.join(__dirname, '..', '..', '..', staticHtml);
      if (!fs.existsSync(fullStaticHtmlPath)) {
        console.log('Defaulting to English after unable to find: ' + fullStaticHtmlPath);
        staticHtml = StaticHtmlPrefix + '.html';
      }
      firstRunSplash = popupWindow.open(staticHtml, {
        width: 1080,
        height: 638,
        frame: false,
        resizable: false,
        show: false,
        'always-on-top': false
      });
      WelcomeSplash.setupBindings(cb);
    };
    if (os.platform() === 'win32') {
      var command = 'powershell.exe -Command "(Get-ItemProperty \'HKCU:\\Control Panel\\International\').LocaleName"';
      var child = exec(command, { maxBuffer: 1024 * 1024 }, readLocale);
      child.stdin.end();
    } else if (os.platform() == 'darwin') {
      var supportedLanguages = Array();
      supportedLanguages.push('en');
      var popupsHtml = fs.readdirSync(path.dirname(path.join(__dirname, '..', '..', '..', StaticHtmlPrefix)));
      for (var i = 0; i < popupsHtml.length; i++) {
        // FIXME: When moved to ui-globals.js, this should iterate over the *.po files, not first-run-*.html
        var langMatch = popupsHtml[i].match(/first-run-(.*).html/);
        if (langMatch) {
          supportedLanguages.push(langMatch[1]);
        }
      }
      var command = shell.escape(path.join(__dirname, '..', '..', '..', 'bin', 'PreferredLocalization')) + ' ' + supportedLanguages.join(' ');
      exec(command, { maxBuffer: 1024 * 1024 }, readLocale);
    }
    else {
      readLocale(null, '', '');
    }
  },

  launchOrientation: function(cb) {
    var orientationPath = PlatformOrientationPaths[os.platform()];
    // completely not scaleable
    var launchLabels = {
      "de": 'Airspace starten',
      "en": 'Launch Airspace',
      "es": 'Iniciar Airspace',
      "fr": 'Lancer Airspace',
      "ja": 'Airspace',
      "pt": 'Iniciar Airspace',
      "zh": 'Airspace'
    };
    var launchLabel = launchLabels[systemLang];
    launchLabel = launchLabel ? launchLabel : 'Launch Airspace';
    if (orientationPath) {
      var $s = $('body', firstRunSplash.window.document);
      $s.css('cursor', 'wait');
      mixpanel.trackEvent('Started Orientation', null, 'OOBE');
      setTimeout(function() {
        $s.css('cursor', 'default');
        var $graphic = $s.hasClass('embedded') ? $s.find('#embedded-graphics') : $s.find('#peripheral-graphics');
        //$graphic.effect("blind"); // don't hide 3 hint images -bherrera 8/29/2013
        var $continueButton = $('#continue', firstRunSplash.window.document);
        
        $continueButton.removeClass('disabled');
        $continueButton.text(launchLabel);
        
        // don't change banner text - this has not been translated -bherrera 8/29/2013
        //$('h1', firstRunSplash.window.document).text('Airspace, the Leap Motion app store');
        //$('h2', firstRunSplash.window.document).text('Discover, download and launch your Leap Motion apps from Airspace - the first-ever place for first-ever apps.');

        $continueButton.click(function() {
          firstRunSplash.close();
          firstRunSplash = null;
          mixpanel.trackEvent('Completed Orientation', null, 'OOBE');
          mixpanel.trackEvent('Airspace Auto-Launched', null, 'OOBE');
          cb && cb(null);
        }.bind(this));
      }.bind(this), 5000);
      nwGui.Shell.openItem(orientationPath);
    } else {
      cb && cb(null);
    }
  }
};



var WelcomeSplash = {
  setupBindings: function(cb) {
    firstRunSplash.on('loaded', function() {
      var splashWindow = firstRunSplash.window;
      var $s = $('body', splashWindow.document);
      $s.css('cursor', 'default');

      var $continueButton = $s.find('#continue');
      if (isEmbeddedLeap) { // EULA required only on hardware embedded with leap. (user didn't run installer so we need to handle the license agreement.)
        $s.addClass('embedded');
        $continueButton.addClass('disabled'); // todo: when fs determines user already agreed to eula, hide eula and do not disable the button
      }

      var $checkbox = $s.find('.eula .checkbox');
      $checkbox.change(function(evt) {
        $continueButton.toggleClass('disabled', !$checkbox.is(':checked'));
      });

      $continueButton.click(function() {
        if ($continueButton.hasClass('disabled')) {
          $s.find('.eula').effect('highlight', '', 1000);
          return;
        }
        $continueButton.addClass('disabled');
        db.setItem(config.DbKeys.AlreadyDidFirstRun, true);
        $s.find('.eula').css('visibility', 'hidden');
        mixpanel.trackEvent('Finished First Run Panel', null, 'OOBE');
        $continueButton.unbind('click');
        cb && cb(null);
      });

      $s.find('.eula-popup').click(function() {
        var eulaWindow = popupWindow.open('/static/popups/license-en.html', {
          title: 'Leap Motion End User Software License Agreement',
          width: 640,
          height: 480,
          frame: true,
          resizable: true,
          show: true,
          x: 50,
          y: 50,
          allowMultiple: false
        });
      });

      $s.find('.close-app').click(function() {
        window.close();
      });

      splashWindow.setTimeout(function() {
        firstRunSplash.show();
        mixpanel.trackEvent('Displayed First Run Panel', null, 'OOBE');
      }, 0);

    });
  }
};

function showFirstRunSequence(cb) {
  async.series([
    // this._checkEulaState.bind(this), to be restored after pongo/media launch, for next embedded system (to avoid eula if user already signed it)
    FirstRunSequence.embeddedLeapCheck,
    FirstRunSequence.showFirstRunSplash,
    FirstRunSequence.launchOrientation
  ], function(err) {
    if (err) {
      console.error('Welcome failed: ' + (err.stack || err));
      if (!isEmbeddedLeap || !db.getItem(config.DbKeys.AlreadyDidFirstRun)) {
        err = null; // must ensure eula agreement, otherwise tolerate failed welcome message
      }
    }
    cb && cb(err);
  });

}

module.exports.showFirstRunSequence = showFirstRunSequence;

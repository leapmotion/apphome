var fs = require('fs-extra');
var path = require('path');
var os = require('os');

var xmlTemplate = fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'tt.xml.template'), 'utf-8');

var PlatformOutputPaths = {
  darwin: [ process.env.HOME, 'Library', 'Preferences', 'DSS', 'auth.plist' ],
  win32: [ process.env.APPDATA, 'LeapMotion', 'tt.xml' ]
};

function generateXml(authId, token) {
  return xmlTemplate.replace('@AUTHID', authId).replace('@TOKEN', token);
}

function writeXml(authId, token) {
  var outputPath = path.join.apply(null, PlatformOutputPaths[os.platform()]);
  if (outputPath) {
    try {
      var outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirsSync(outputDir);
      }
      fs.writeFileSync(outputPath, generateXml(authId, token));
    } catch (err) {
      console.error('Cannot write DRM XML: ' + err.stack);
    }
  } else {
    console.error('Cannot write DRM XML for platform: ' + os.platform());
  }
}

module.exports.writeXml = writeXml;

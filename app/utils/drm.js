var fs = require('fs-extra');
var path = require('path');
var os = require('os');
var async = require('async');

var xmlTemplate = fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'tt.xml.template'), 'utf-8');

var PlatformOutputPaths = {
  darwin: [ process.env.HOME, 'Library', 'Preferences', 'DSS', 'auth.plist' ],
  win32: [ process.env.APPDATA, 'Leap Motion', 'tt.xml' ]
};

function _generateXml(authId, token) {
  return xmlTemplate.replace('@AUTHID', authId).replace('@TOKEN', token);
}


function writeXml(authId, token) {
  if (!PlatformOutputPaths[os.platform()]) {
    console.warn('DRM not supported for platform: ' + os.platform());
    return;
  }
  var outputPath = path.join.apply(null, PlatformOutputPaths[os.platform()]);
  if (outputPath) {
    var ctx = {
      outputPath: outputPath,
      outputDir: path.dirname(outputPath),
      authId: authId,
      token: token
    };

    async.waterfall([
      function(next) {
        next(null, ctx);
      },
      _ensureDirectory,
      _checkContent,
      _writeXmlToDisk
    ], function(err, ctx) {
      if (err) {
        console.error('Cannot write DRM XML: ' + (err.stack || err));
      }
    });
  }
}

// todo: refactor with workingFile.ensureDirectory
function _ensureDirectory(ctx, next) {
  fs.exists(ctx.outputDir, function(doesExist) {
    if (!doesExist) {
      fs.mkdirs(ctx.outputDir, function(mkdirErr) {
        next && next(mkdirErr, ctx);
      });
    } else {
      next && next(null, ctx);
    }
  });
}


function _checkContent(ctx, next) {
  fs.exists(ctx.outputPath, function(doesExist) {
    if (!doesExist) {
      console.log('Need to create DRM file: ' + ctx.outputPath);
      ctx.needsWriting = true;
      next && next(null, ctx);
    } else {
      fs.readFile(ctx.outputPath, function(err, data) {
        if (!err) {
          ctx.needsWriting = !(new RegExp(ctx.token)).test(data);
        } else {
          ctx.needsWriting = true;
        }
        console.log('DRM ' + (ctx.needsWriting ? 'needs' : 'does not need') + ' updating.');
        next && next(null, ctx);
      });
    }
  });
}

function _writeXmlToDisk(ctx, next) {
  if (ctx.needsWriting) {
    console.log('Writing DRM file to ' + ctx.outputPath);
    fs.writeFile(ctx.outputPath, _generateXml(ctx.authId, ctx.token), function(err) {
      next(err, ctx);
    });
  } else {
    next(null, ctx);
  }
}



module.exports.writeXml = writeXml;

var domain = require('domain');
var net = require('net');

var ReportServerPort = 22001; // TODO: move to config file (used in test-runner)

function SocketReporter(runner) {
  var connected = true;
  var queue = [];

  net.connect(ReportServerPort, '127.0.0.1');

  var reporterClient = net.connect(ReportServerPort, '127.0.0.1', function() {
    console.log('client connected');
    connected = true;
    for (var i = 0, len = queue.length; i < len; i++) {
      reporterClient.write(JSON.stringify(queue[i]), 'utf8');
    }
    queue = [];
  });
  reporterClient.setNoDelay(true);
  reporterClient.on('end', function() {
    connected = false;
  });
  reporterClient.on('error', function(err) {
    connected = false;
    console.error(err.stack || err);
  });

  function sendTestResult(result, test, err) {
    var data = {
      result: result,
      title: test.title,
      fullTitle: test.fullTitle(),
      duration: test.duration
    };
    if (err) {
      data.error = {
        message: err.message,
        stack: err.stack
      };
    }
    if (connected) {
      reporterClient.write(JSON.stringify(data), 'utf8');
    } else {
      queue.unshift(data);
    }
  }

  runner.on('pass', function(test) {
    sendTestResult('pass', test);
  });

  runner.on('fail', function(test, err) {
    sendTestResult('fail', test, err);
  });

  runner.on('end', function() {
    reporterClient.end();
    process.exit();
  });
}

module.exports = SocketReporter;

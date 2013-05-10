var net = require('net');


var ReportServerPort = 22001; // TODO: move to config file (used in test-runner)

function SocketReporter(runner) {

  var reporterClient = net.createConnection(ReportServerPort);
  reporterClient.setNoDelay(true);

// todo: delay start of tests until after connected?

  var sendTestResult = function(result, test) {
    var data = {
      result: result,
      title: test.title,
      fullTitle: test.fullTitle(),
      duration: test.duration
    };
    reporterClient.write(JSON.stringify(data), 'utf8');
  };

  runner.on('pass', function(test) {
    sendTestResult('pass', test);
  });

  runner.on('fail', function(test, err) {
    // TODO: send/log more details
    console.log('tmp - test.inspect ' + test.inspect());
    sendTestResult('fail', test);
  });

  runner.on('end', function() {
    process.exit();
  });
}

module.exports = SocketReporter;

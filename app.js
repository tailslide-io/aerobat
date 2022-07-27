require('dotenv').config();
const fork = require('child_process').fork;

const NatsClient = require('./lib/natsClient');

const NatsConfig = {
  stream: process.env.NATS_STREAM,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_SUBJECT,
  token: process.env.SDK_KEY,
  callback: trackCircuitManagers,
};

const processTrackers = {};

function trackCircuitManagers(flags, subject) {
  if (flags.length === 0) {
    if (subject in processTrackers) {
      delete processTrackers[subject];
      processTrackers[subject].send('');
    }
    return;
  }
  if (subject in processTrackers) {
    return;
  }

  const appId = subject.match(/apps\.(\d+)\.update\.manual/)[1];

  const child = fork('./aerobat.js', [appId]);

  processTrackers[subject] = child;
}

function cleanupProcesses() {
  console.log('trying to close app.js');
  Object.entries(processTrackers).forEach(([processName, childProcess]) => {
    childProcess.send('hello you are closing');
  });
  process.exit();
}

process.on('SIGINT', cleanupProcesses);

(async () => {
  const circuitOrganizer = new NatsClient(NatsConfig);
  const lastMsgPerSubject = true;
  await circuitOrganizer.initializeFlags(lastMsgPerSubject);
})();

/*
apps.1.update.manual
apps.2.update.manual
apps.3.update.manual

CircuitOrganizer 
  -> get the last messages from 1, 2, and 3 (and new apps.*) 
    -> keyword: deliverlastPersubject
  -> get all on going messages from 1, 2, 3


apps.1.>
CircuitHandler
  -> get the last messages from 1.>
  -> get all ongoing messages from 1.>

*/

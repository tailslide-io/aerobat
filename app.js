require('dotenv').config();
const fork = require('child_process').fork;

const NatsClient = require('./lib/natsClient');

//  stream, server, subject, callback, token
const NatsConfig = {
  stream: process.env.NATS_STREAM,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_SUBJECT, //
  token: process.env.SDK_KEY,
  callback: trackCircuitManagers,
};

const processTrackers = {};

function trackCircuitManagers(flags, subject) {
  // handle when no more flags
  // subject: apps.3.update.manual
  if (flags.length === 0) {
    if (subject in processTrackers) {
      delete processTrackers[subject];
      processTrackers[subject].send('');
    }
    return;
  }
  // handle flags
  // return if process already exists
  if (subject in processTrackers) {
    return;
  }

  // create new process
  // subscribeSubject: apps.3.>
  const appId = subject.match(/apps\.(\d+)\.update\.manual/)[1];

  const child = fork('./aerobat.js', [appId, process.env.REDIS_POLL_RATE]);

  processTrackers[subject] = child;
}

function cleanupProcesses() {
  Object.entries(processTrackers).forEach(([processName, childProcess]) => {
    childProcess.send('');
    delete processTrackers[processName];
  });
}

(async () => {
  const circuitOrganizer = new NatsClient(NatsConfig);
  const lastMsgPerSubject = true;
  await circuitOrganizer.initializeFlags(lastMsgPerSubject);

  process.on('exit', cleanupProcesses);
  // process.on('SIGINT', cleanupProcesses);
  // process.on('SIGTERM', cleanupProcesses);
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

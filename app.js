require('dotenv').config();
const fork = require('child_process').fork;

const NatsClient = require('./lib/natsClient');

const NatsConfig = {
  stream: process.env.NATS_STREAM_NAME,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_AEROBAT_SUBJECT,
  token: process.env.SDK_KEY,
  callback: trackCircuitManagers,
};

const processTrackers = {};

function trackCircuitManagers(flags, subject) {
  if (flags.length === 0) {
    if (subject in processTrackers) {
      processTrackers[subject].kill();
      delete processTrackers[subject];
    }
    return;
  }
  if (subject in processTrackers) {
    return;
  }

  const appId = subject.match(/apps\.(\d+)\.update\.manual/)[1];
  const child = fork('./aerobat.js', [appId]);
  child.send(flags);
  processTrackers[subject] = child;

  console.log(processTrackers)
}

function cleanupProcesses() {
  console.log('trying to close app.js');
  Object.values(processTrackers).forEach((controller) => {
    controller.kill();
  });
  process.exit();
}

process.on('SIGINT', cleanupProcesses);

(async () => {
  const circuitOrganizer = new NatsClient(NatsConfig);
  console.log("Aerobat successfully connected to NATS")
  const lastMsgPerSubject = true;
  await circuitOrganizer.initializeFlags(lastMsgPerSubject);
})();
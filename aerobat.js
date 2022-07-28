require('dotenv').config();
const CircuitManager = require('./lib/circuitManager');

const appId = process.argv[2];
const redisPollRate = Number(process.env.REDIS_POLL_RATE);

const circuitConfig = {
  stream: process.env.NATS_STREAM,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_SUBJECT,
  token: process.env.NATS_SERVER,
  appId,
  redisAddress: '',
  sdkKey: process.env.SDK_KEY,
  timeWindow: process.env.REDIS_TIME_WINDOW,
};

let manager = new CircuitManager(circuitConfig);

const cleanupAndExit = async () => {
  await manager.disconnect();
  process.exit();
};

function runCircuits(latestFlags) {
  (async () => {
    await manager.initializeCircuit(latestFlags);
    const circuitBreaker = manager.circuitBreaker;

    setInterval(async () => {}, redisPollRate);

    (async function checkCircuits() {
      console.log(`checking circuits within setInterval in app ${appId}`);
      console.log('checking circuits within setInterval');
      await circuitBreaker.checkCircuits();
      setTimeout(checkCircuits, redisPollRate);
    })();
  })();
}

process.on('message', (latestFlags) => {
  runCircuits(latestFlags);
});

process.on('SIGTERM', async () => {
  await cleanupAndExit();
});

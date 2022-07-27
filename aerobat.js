require('dotenv').config();
const CircuitManager = require('./lib/circuitManager');

const appId = process.argv[2];
const redisPollRate = Number(process.argv[3]);

let manager;

const cleanup = async () => {
  await manager.disconnect();
  console.log('closing nats');
};

const circuitConfig = {
  stream: process.env.NATS_STREAM,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_SUBJECT,
  token: process.env.NATS_SERVER,
  appId,
  redisAddress: '',
  sdkKey: 'myToken',
  timeWindow: 10000,
};

(async () => {
  manager = new CircuitManager(circuitConfig);
  await manager.initializeCircuit();
  const circuitBreaker = manager.circuitBreaker;

  setInterval(async () => {
    console.log(`checking circuits within setInterval in app ${appId}`);
    await circuitBreaker.checkCircuits();
  }, redisPollRate);
  console.log(manager.getActiveRules());

  process.on('message', () => {
    cleanup();
    process.exit();
  });
})();

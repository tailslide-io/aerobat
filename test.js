const CircuitManager = require('./lib/circuitManager');

const config = {
  stream: 'flags_ruleset',
  server: 'nats://127.0.0.1:4222',
  appId: 1,
  redisAddress: '',
  sdkKey: 'myToken',
  timeWindow: 10000,
};

let manager;

const cleanup = async () => {
  await manager.disconnect();
  console.log('closing nats');
};

(async () => {
  manager = new CircuitManager(config);
  await manager.initializeCircuit();
  const circuitBreaker = manager.circuitBreaker;

  setInterval(async () => {
    console.log('checking circuits within setInterval');
    await circuitBreaker.checkCircuits();
  }, 4000);
  console.log(manager.getActiveRules());

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();

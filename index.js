const CircuitManager = require('./lib/circuitManager');

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 9,
  redisAddress: '',
};

(async () => {
  const manager = new CircuitManager(config);
  await manager.initializeCircuit();
  const circuitBreaker = manager.circuitBreaker;

  setInterval(() => {
    circuitBreaker.checkCircuits();
  }, 500);
  console.log(manager.getActiveRules());

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();

const NatsClient = require('./natsClient');
const CircuitBreaker = require('./circuitBreaker');

class CircuitManager {
  constructor({ server, appId, sdkKey = '', redisAddress = '' }) {
    this.natsClient = new NatsClient({
      server,
      appId,
      callback: this._setActiveRules.bind(this),
      sdkKey,
    });
    this.circuitBreaker = new CircuitBreaker({
      redisAddress,
      natsPublish: this.natsClient.publishMessage(),
      getActiveRules: this.getActiveRules.bind(this),
    });
    this.activeRules = [];
  }

  async initializeCircuit() {
    await this.natsClient.initializeFlags();
    await this.circuitBreaker.init();
  }

  _setActiveRules(flags) {
    // transform flag rules to include only flagId and errorThreshold
    // filter by is_active === true && error_threshold > 0
    const filteredFlags = flags.filter(
      (flag) => flag.is_active && Number(flag.error_threshold) > 0
    );
    const transformedRules = filteredFlags.map((flag) => {
      return { flagId: flag.id, errorThreshold: Number(flag.error_threshold) };
    });
    this.activeRules = transformedRules;
  }

  getActiveRules() {
    return this.activeRules;
  }

  async disconnect() {
    await this.natsClient.disconnect();
  }
}

module.exports = CircuitManager;

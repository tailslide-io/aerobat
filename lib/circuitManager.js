const NatsClient = require('./natsClient');
const CircuitBreaker = require('./circuitBreaker');

class CircuitManager {
  constructor({ server, appId, sdkKey = '', redisAddress }) {
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
    // this.redisTSClient = new RedisTimeSeriesClient(redisAddress);
  }

  async initializeFlags() {
    await this.natsClient.initializeFlags();
    // await this.redisTSClient.init();
  }

  _setActiveRules(flags) {
    // transform flag rules to include only flagId and errorThreshold
    // filter by is_active === true && error_threshold > 0
    const filteredFlags = flags.filter(
      (flag) => flag.is_active && flag.error_threshold > 0
    );
    const transformedRules = filteredFlags.map((flag) => {
      return { flagId: flag.id, errorThreshold: flag.error_threshold };
    });
    this.rules = transformedRules;
  }

  getActiveRules() {
    return this.activeRules;
  }

  async disconnect() {
    await this.natsClient.disconnect();
    // await this.redisTSClient.disconnect();
  }
}

const options = {
  url: 'fulladdress',
};

module.exports = CircuitManager;

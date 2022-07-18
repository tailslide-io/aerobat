const RedisTimeSeriesClient = require('./redisTimeSeriesClient');

class CircuitBreaker {
  constructor({ redisAddress, getActiveRules, natsPublish }) {
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress);
  }
}

module.exports = CircuitBreaker;

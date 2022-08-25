const { createClient } = require('redis');
const { TimeSeriesAggregationType } = require('@redis/time-series');

class RedisTimeSeriesClient {
  constructor(redisAddress, timeWindow) {
    this.redisAddress = redisAddress || 'http://localhost:6379';
    this.redisClient = null;
    this.timeWindow = timeWindow;
  }

  async init() {
    this.redisClient = createClient(this.redisAddress);
    await this.redisClient.connect();
  }

  async queryByAppId(appId) {
    const now = Date.now();
    const queryResults = await this.redisClient?.ts.MRANGE(
      now - this.timeWindow,
      now,
      `appId=${appId}`,
      {
        AGGREGATION: {
          type: TimeSeriesAggregationType.SUM,
          timeBucket: this.timeWindow,
        },
        ALIGN: 'start',
      }
    );
    return queryResults;
  }
}

module.exports = RedisTimeSeriesClient;

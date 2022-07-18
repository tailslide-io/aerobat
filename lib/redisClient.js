const { createClient } = require('redis');
const { DuplicatePolicy, Aggregation } = RedisTimeSeries;

class RedisTimeSeriesClient {
  constructor(redisAddress) {
    this.redisAddress = { url: redisAddress } || {
      url: 'http://localhost:6379',
    };
    this.redisClient = null;
  }

  async init() {
    this.redisClient = createClient({ url: this.redisAddress });
    await this.redisClient.connect();
  }

  emitSignal(...args) {
    // binding function that maintains the RedisClient Context whenever we invoke emitRedisSignal
    return this.emitRedisSignal.bind(this, ...args);
  }

  /*
  bucket view of y-axis counts over x-axis tie
  onDuplicate - deals with two hits at the exact time 
  labels -> indexes for queries on Handler end
  `key = 16:failure`
  `time = Date.now()`
  `value = failureCount of flagId`
    `label -> status -> failure/success
    `flagId
  `16:failure failureCount`
  `TS.ADD 16:failure Date.now() 1 LABELS type success flagname flag_1`
  */

  async readRedisSignal(flagId, status) {
    const now = Date.now();
    const query = await this.redisClient?.ts.MRANGE(now - 10000, now, `flagId:${}`)
    return query;
  }
}

module.exports = RedisTimeSeriesClient;

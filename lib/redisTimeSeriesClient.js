const { createClient } = require('redis');
const { TimeSeriesAggregationType } = require('@redis/time-series');

class RedisTimeSeriesClient {
  constructor(redisAddress) {
    //
    this.redisAddress = { url: redisAddress } || {
      url: 'http://localhost:6379',
    };
    this.redisClient = null;
  }

  async init() {
    this.redisClient = createClient({ url: this.redisAddress }); // should this be createClient(this.redisAddress)
    await this.redisClient.connect();
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

  /*
  return value of below query:
    {
      key: '8:failure',
      samples: [ { timestamp: 1658150058511, value: 5 } ]
    }
    {
      key: '8:success',
      samples: [ { timestamp: 1658150058511, value: 16 } ]
    }
  */

  async queryByFlagId(flagId) {
    const now = Date.now();
    const queryResults = await this.redisClient?.ts.MRANGE(
      now - 10000,
      now,
      `flagId=${flagId}`,
      {
        AGGREGATION: {
          type: TimeSeriesAggregationType.SUM,
          timeBucket: 10000,
        },
        ALIGN: 'start',
      }
    );
    return queryResults;
  }

  calculateErrorRate(queryResults) {
    const failureCount = this.getResultsByKey(queryResults, 'failure')
      .samples[0].value;
    const successCount = this.getResultsByKey(queryResults, 'success')
      .samples[0].value;
    const errorRate = failureCount / (failureCount + successCount);
    return errorRate;
  }

  // key is 'failure' or 'success'
  getResultsByKey(queryResults, key) {
    const regex = new RegExp(key);

    return queryResults.find((result) => key.test(result.key));
  }
}

module.exports = RedisTimeSeriesClient;

const RedisTimeSeriesClient = require('./redisTimeSeriesClient');

class CircuitBreaker {
  constructor({ redisAddress, getActiveRules, natsPublish }) {
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress);
    this.getActiveRules = getActiveRules;
    this.natsPublish = natsPublish;
  }
  async init() {
    await this.redisTSClient.init();
  }

  // Check the Error Rate
  // Depending on Error Rate, open the Circuit
  async checkCircuits() {
    const activeRules = this.getActiveRules();
    // eventually, make Redis qurey all active flags here
    for (let activeRule of activeRules) {
      await this.checkCircuit(activeRule);
    }
  }

  // call query and get results
  // filter results by key (getResultsByKey)
  // calculate errorRate by filtered results
  // compare agains activeRule value - call openCircuit if greater than

  // activeRules = [
  //   { flagId: 16, errorThreshold: 50.5 },
  //   { flagId: 17, errorThreshold: 60.5 }
  // ]
  async checkCircuit(activeRule) {
    const { flagId, errorThreshold } = activeRule;
    const queryResults = await this.redisTSClient.queryByFlagId(flagId);
    const errorRate = this.calculateErrorPercent(queryResults);
    console.log('Error rate', errorRate);
    if (this.circuitTripped(errorRate, errorThreshold)) {
      this.openCircuit(flagId);
    }
  }

  // create a topic called circuitOpen -> set up on the TowerAPI tbd
  openCircuit(flagId) {
    console.log('circuit open for', flagId);
    this.natsPublish('circuitOpen', flagId);
  }

  circuitTripped(errorRate, threshold) {
    return errorRate > threshold;
  }

  getResultsByKey(queryResults, type) {
    console.log(queryResults);
    const regex = new RegExp(type);
    return queryResults.find((result) => regex.test(result.key));
  }

  calculateErrorPercent(queryResults) {
    const failureCount = this.getResultsByKey(queryResults, 'failure')
      .samples[0].value;
    const successCount = this.getResultsByKey(queryResults, 'success')
      .samples[0].value;
    const errorPercent = (failureCount / (failureCount + successCount)) * 100;
    return errorPercent;
  }
}

module.exports = CircuitBreaker;

/*
For each active rule in active rules
  query the redis database for the results for the flag, :success, :failures
  calculate error rate
  if error rate > threshold for that flag
    publish to nats jetsream, "circuit_open": flagId

openCircuits
openCircuit
*/

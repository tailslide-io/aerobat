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

    // stream: flags
    // subject: circuitOpen
    // message/payload: flagId
    this.natsPublish(flagId);
  }

  circuitTripped(errorRate, threshold) {
    return errorRate > threshold;
  }

  getResultSamplesByKey(queryResults, type) {
    console.log(queryResults);
    const regex = new RegExp(type);
    const samples = queryResults.find((result) =>
      regex.test(result.key)
    ).samples;
    return samples.length > 0 ? samples[0].value : 0;
  }

  calculateErrorPercent(queryResults) {
    const failureCount = this.getResultSamplesByKey(queryResults, 'failure');
    const successCount = this.getResultSamplesByKey(queryResults, 'success');
    const totalCount = failureCount + successCount || 1;
    const errorPercent = (failureCount / totalCount) * 100;
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

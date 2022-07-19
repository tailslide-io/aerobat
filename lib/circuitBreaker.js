const RedisTimeSeriesClient = require('./redisTimeSeriesClient');

class CircuitBreaker {
  constructor({ redisAddress, getActiveRules, natsPublish, appId }) {
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress);
    this.getActiveRules = getActiveRules;
    this.natsPublish = natsPublish;
    this.appId = appId;
  }
  async init() {
    await this.redisTSClient.init();
  }
  /*
    - active rules
    [
      {
        id,
        error_threshold
        success datapoints
        failure datapoints
      }
    ]
    
    - Check individual circuit
      
  */
  async checkCircuits() {
    const activeRules = this.getActiveRules();
    const timeSeriesData = await this.redisTSClient.queryByAppId(this.appId);
    console.log(timeSeriesData, ' in check circuit');
    let mappedRulesData = this._mapTimeSeriesDataWithActiveRules(
      activeRules,
      timeSeriesData
    );
    mappedRulesData.forEach(this.checkCircuit.bind(this));

    // activeRules = [{flagId: 1, errorThre}hold: 50], {flagId: 2, errorThreshold: 20}]

    // mapping over activeRules to get the data for those rules

    // eventually, make Redis qurey all active flags here
    // for (let activeRule of activeRules) {
    //   await this.checkCircuit(activeRule);
    // }
  }

  _mapTimeSeriesDataWithActiveRules(activeRules, timeSeriesData) {
    return activeRules.map((rule) => {
      const successData = timeSeriesData.find(
        (data) => data.key === `${rule.flagId}:success`
      );
      const failureData = timeSeriesData.find(
        (data) => data.key === `${rule.flagId}:failure`
      );

      const success = this._normalizeData(successData);
      const failure = this._normalizeData(failureData);

      return { success, failure, ...rule };
    });
  }

  _normalizeData(data) {
    return data.samples.length > 0 ? data.samples[0].value : 0;
  }

  checkCircuit(ruleData) {
    const { flagId, errorThreshold, success, failure } = ruleData;
    const errorRate = this.calculateErrorPercent(success, failure);
    console.log('Error rate', errorRate);
    if (this.circuitTripped(errorRate, errorThreshold)) {
      this.openCircuit(flagId);
    }
  }

  openCircuit(flagId) {
    console.log('circuit open for', flagId);
    this.natsPublish(flagId);
  }

  circuitTripped(errorRate, threshold) {
    return errorRate > threshold;
  }

  getResultSamplesByKey(queryResults, type) {
    console.log(queryResults);
    const regex = new RegExp(type);
    const data = queryResults.find((result) => regex.test(result.key));
    return this._normalizeData(data);
  }

  calculateErrorPercent(successCount, failureCount) {
    // const failureCount = this.getResultSamplesByKey(queryResults, 'failure');
    // const successCount = this.getResultSamplesByKey(queryResults, 'success');
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
*/

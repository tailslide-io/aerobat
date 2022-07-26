const RedisTimeSeriesClient = require('./redisTimeSeriesClient');

const CIRCUIT_OPEN_SUBJECT = 'circuit_open';
const CIRCUIT_RECOVERY_START_SUBJECT = 'circuit_recovery_start';
const CIRCUIT_RECOVERY_UPDATE_SUBJECT = 'circuit_recovery_update';
const CIRCUIT_CLOSE_SUBJECT = 'circuit_close';

class CircuitBreaker {
  constructor({
    redisAddress,
    getActiveRules,
    natsPublish,
    appId,
    timeWindow,
  }) {
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress, timeWindow);
    this.getActiveRules = getActiveRules;
    this.natsPublish = natsPublish;
    this.appId = appId;
  }
  async init() {
    await this.redisTSClient.init();
  }

  async checkCircuits() {
    const activeRules = this.getActiveRules();
    const timeSeriesData = await this.redisTSClient.queryByAppId(this.appId);
    console.log(timeSeriesData, ' in checkCircuits');
    let mappedRulesData = this._mapTimeSeriesDataWithActiveRules(
      activeRules,
      timeSeriesData
    );
    mappedRulesData.forEach(this.checkCircuit.bind(this));
  }

  checkCircuit(ruleData) {
    const { errorThresholdPercentage, success, failure, circuitStatus } =
      ruleData;
    const errorRate = this._calculateErrorPercent(success, failure);
    console.log('Error rate', errorRate);
    if (
      circuitStatus !== 'open' &&
      this._circuitTripped(errorRate, errorThresholdPercentage)
    ) {
      return this._openCircuit(ruleData);
    }
    // recovery flags check
    if (!this._shouldRecover(ruleData) || !this._timeForRecovery(ruleData)) {
      console.log('not recovering');
      return;
    }
    console.log('is recovering');

    this._recoverCircuit(ruleData);
  }

  _mapTimeSeriesDataWithActiveRules(activeRules, timeSeriesData) {
    return activeRules.map((rule) => {
      const successData = timeSeriesData.find(
        (data) => data.key === `${rule.flagId}:success`
      );
      const failureData = timeSeriesData.find(
        (data) => data.key === `${rule.flagId}:failure`
      );

      let success;
      let failure;

      if (!successData) {
        success = 0;
      } else {
        success = this._normalizeData(successData);
      }

      if (!failureData) {
        failure = 0;
      } else {
        failure = this._normalizeData(failureData);
      }

      return { success, failure, ...rule };
    });
  }

  _normalizeData(data) {
    return data.samples.length > 0 ? data.samples[0].value : 0;
  }

  _getResultSamplesByKey(queryResults, type) {
    console.log(queryResults);
    const regex = new RegExp(type);
    const data = queryResults.find((result) => regex.test(result.key));
    return this._normalizeData(data);
  }

  _calculateErrorPercent(successCount, failureCount) {
    const totalCount = failureCount + successCount || 1;
    const errorPercent = (failureCount / totalCount) * 100;
    return errorPercent;
  }

  _initializeRecovery({
    flagId,
    circuitRecoveryDelay,
    circuitInitialRecoveryPercentage,
  }) {
    setTimeout(() => {
      console.log('timeout finished');
      this.natsPublish(CIRCUIT_RECOVERY_START_SUBJECT, {
        flagId,
        circuitInitialRecoveryPercentage,
      });
    }, circuitRecoveryDelay);
  }

  _getRecoveryMethod(profile) {
    const methods = {
      linear: (current, increment) => current + increment,
      exponential: (current, increment) => current * (1 + increment / 100),
    };
    return methods[profile];
  }

  _openCircuit({
    flagId,
    isRecoverable,
    circuitRecoveryDelay,
    circuitInitialRecoveryPercentage,
  }) {
    this.natsPublish(CIRCUIT_OPEN_SUBJECT, flagId);
    console.log('circuit tripped');
    if (isRecoverable) {
      this._initializeRecovery({
        flagId,
        circuitRecoveryDelay,
        circuitInitialRecoveryPercentage,
      });
    }
  }

  _circuitTripped(errorRate, threshold) {
    return errorRate > threshold;
  }

  _updateRecoveryPercentage({
    circuitRecoveryPercentage,
    circuitRecoveryIncrementPercentage,
    circuitRecoveryProfile,
  }) {
    const recoveryMethod = this._getRecoveryMethod(circuitRecoveryProfile);
    const updatedPercentage = recoveryMethod(
      circuitRecoveryPercentage,
      circuitRecoveryIncrementPercentage
    );
    return updatedPercentage;
  }

  _shouldRecover({ circuitStatus, isRecoverable }) {
    return circuitStatus === 'recovery' && isRecoverable;
  }

  _timeForRecovery({ updatedAt, circuitRecoveryRate }) {
    return Date.now() - new Date(updatedAt) > circuitRecoveryRate;
  }

  _recoverCircuit(ruleData) {
    const updatedPercentage = this._updateRecoveryPercentage(ruleData);
    const flagId = ruleData.flagId;
    if (updatedPercentage < 100) {
      this.natsPublish(CIRCUIT_RECOVERY_UPDATE_SUBJECT, {
        flagId,
        circuitRecoveryPercentage: updatedPercentage,
      });
    } else {
      this.natsPublish(CIRCUIT_CLOSE_SUBJECT, flagId);
    }
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

/*
    - active rules
    [
      {
        id,
        error_threshold
        circuit_status
        is_recoverable
        circuit_recovery_percentage
        circuit_recovery_delay
        circuit_initial_recovery_percentage
        circuit_recovery_rate
        circuit_recovery_increment_percentage
        circuit_recovery_profile
        success datapoints
        failure datapoints
      }
    ]
    
    - Check individual circuit
  */

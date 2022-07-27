const NatsClient = require('./natsClient');
const CircuitBreaker = require('./circuitBreaker');

class CircuitManager {
  constructor({
    stream = '',
    server,
    appId,
    sdkKey = '',
    redisAddress = '',
    timeWindow = 4000,
  }) {
    const natsSubject = `apps.${appId}.>`;
    this.natsClient = new NatsClient({
      stream,
      server,
      subject: natsSubject,
      callback: this._setActiveRules.bind(this),
      token: sdkKey,
    });
    this.circuitBreaker = new CircuitBreaker({
      redisAddress,
      natsPublish: this.natsClient.publish(),
      getActiveRules: this.getActiveRules.bind(this),
      appId,
      timeWindow,
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
    const filteredFlags = this._filterFlagsByActiveState(flags);
    const transformedRules = filteredFlags.map((flag) => {
      return {
        flagId: flag.id,
        errorThresholdPercentage: flag.error_threshold_percentage,
        circuitStatus: flag.circuit_status,
        isRecoverable: flag.is_recoverable,
        circuitRecoveryPercentage: flag.circuit_recovery_percentage,
        circuitRecoveryDelay: flag.circuit_recovery_delay,
        circuitInitialRecoveryPercentage:
          flag.circuit_initial_recovery_percentage,
        circuitRecoveryRate: flag.circuit_recovery_rate,
        circuitRecoveryIncrementPercentage:
          flag.circuit_recovery_increment_percentage,
        circuitRecoveryProfile: flag.circuit_recovery_profile,
        updatedAt: flag.updated_at,
      };
    });
    this.activeRules = transformedRules;
  }

  _filterFlagsByActiveState(flags) {
    return flags.filter(
      (flag) => flag.is_active && flag.error_threshold_percentage > 0
    );
  }

  getActiveRules() {
    return this.activeRules;
  }

  async disconnect() {
    await this.natsClient.disconnect();
  }
}

module.exports = CircuitManager;

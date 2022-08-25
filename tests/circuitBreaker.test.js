const CircuitBreaker = require('../lib/circuitBreaker');
const RedisTimeSeriesClient = require('../lib/redisTimeSeriesClient');

let circuit;

describe('testing circuit breaker', () => {
  beforeEach(() => {
    circuit = new CircuitBreaker({});
  });

  it('can can normalize data', () => {
    const data1 = { samples: [{ value: 1.5 }] };
    const data2 = { samples: [] };
    expect(circuit._normalizeData(data1)).toBe(1.5);
    expect(circuit._normalizeData(data2)).toBe(0);
  });

  it('can update recovery percentage', () => {
    const circuitRecoveryPercentage = 10;
    const circuitRecoveryIncrementPercentage = 5;
    const circuitRecoveryProfile = 'linear';
    const recoveryResult = circuit._updateRecoveryPercentage({
      circuitRecoveryPercentage,
      circuitRecoveryIncrementPercentage,
      circuitRecoveryProfile,
    });

    expect(recoveryResult).toBe(
      circuitRecoveryPercentage + circuitRecoveryIncrementPercentage
    );
  });

  it('can determine if a flag should recover', () => {
    const circuitStatus = 'recovery';
    let isRecoverable = true;

    let shouldRecover = circuit._shouldRecover({
      circuitStatus,
      isRecoverable,
    });
    expect(shouldRecover).toBe(true);

    isRecoverable = false;
    shouldRecover = circuit._shouldRecover({
      circuitStatus,
      isRecoverable,
    });

    expect(shouldRecover).toBe(false);
  });

  it('can determine if it is time for recovery', () => {
    const circuitRecoveryRate = 1000;
    let withinDelay = Date.now() - circuitRecoveryRate;

    let timeForRecovery = circuit._timeForRecovery({
      updatedAt: withinDelay,
      circuitRecoveryRate,
    });
    expect(timeForRecovery).toBe(false);

    withinDelay = Date.now() - circuitRecoveryRate + 100;
    timeForRecovery = circuit._timeForRecovery({
      updatedAt: withinDelay,
      circuitRecoveryRate,
    });
    expect(timeForRecovery).toBe(false);

    const pastDelay = Date.now() - circuitRecoveryRate - 100;

    timeForRecovery = circuit._timeForRecovery({
      updatedAt: pastDelay,
      circuitRecoveryRate,
    });
    expect(timeForRecovery).toBe(true);
  });

  it('can determine if circuit tripped', () => {
    let errorRate = 75;
    let threshold = 70;
    let circuitTripped = circuit._circuitTripped(errorRate, threshold);
    expect(circuitTripped).toBe(true);

    errorRate = 69;
    circuitTripped = circuit._circuitTripped(errorRate, threshold);
    expect(circuitTripped).toBe(false);
  });

  it('can calculate error percentage', () => {
    let successes = 5;
    let failures = 5;
    let errorPercent = (failures / (successes + failures)) * 100;
    expect(circuit._calculateErrorPercent(successes, failures)).toBe(
      errorPercent
    );

    expect(circuit._calculateErrorPercent(0, 0)).toBe(0);
    expect(circuit._calculateErrorPercent(0, 1)).toBe(100);
  });
});

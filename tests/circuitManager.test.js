const CircuitManager = require('../lib/circuitManager');

const flags = [
  {
    id: 1,
    error_threshold_percentage: 10,
    is_active: true,
  },
  {
    id: 2,
    error_threshold_percentage: 10,
    is_active: false,
  },
  {
    id: 3,
    error_threshold_percentage: 0,
    is_active: false,
  },
  {
    id: 4,
    error_threshold_percentage: 0,
    is_active: false,
  },
];

let manager;

describe('testing CircuitManager', () => {
  beforeEach(() => {
    manager = new CircuitManager({});
  });

  it('can filter active flags', () => {
    const filteredFlags = manager._filterFlagsByActiveState(flags);
    expect(filteredFlags.length).toBe(1);
    expect(filteredFlags[0].id).toBe(flags[0].id);
  });

  it('can set active rules', () => {
    manager._setActiveRules(flags);
    expect(manager.activeRules.length).toBe(1);
    expect(manager.activeRules[0].flagId).toBe(flags[0].id);
  });

  it('can return active flags', () => {
    manager._setActiveRules(flags);
    expect(manager.getActiveRules().length).toBe(1);
    expect(manager.getActiveRules()[0].flagId).toBe(flags[0].id);
  });
});

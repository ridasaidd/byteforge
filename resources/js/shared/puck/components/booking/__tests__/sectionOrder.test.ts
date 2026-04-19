import { describe, expect, it } from 'vitest';
import {
  getDefaultBookingFlowResolution,
  resolveBookingSectionFlow,
} from '../sectionOrder';

describe('booking section flow resolution', () => {
  it('normalizes a reordered slot-only section configuration to canonical runtime order', () => {
    const resolution = resolveBookingSectionFlow(
      ['service', 'resource', 'date', 'slot', 'customer', 'confirm'],
      { serviceId: 0 },
    );

    expect(resolution.usesFallback).toBe(false);
    expect(resolution.normalizedOrder).toEqual([
      'service',
      'date',
      'resource',
      'slot',
      'customer',
      'confirm',
    ]);
    expect(resolution.supportedModes).toEqual(['slot']);
    expect(resolution.messageTone).toBe('info');
  });

  it('rejects range checkout sections and falls back to the safe slot flow', () => {
    const resolution = resolveBookingSectionFlow(
      ['service', 'date', 'resource', 'slot', 'range_checkout', 'customer', 'confirm'],
      { serviceId: 0 },
    );

    expect(resolution.usesFallback).toBe(true);
    expect(resolution.supportedModes).toEqual(['slot']);
    expect(resolution.messageTone).toBe('error');
    expect(resolution.message).toMatch(/not supported in the current appointment booking widget/i);
  });

  it('rejects structurally invalid section configurations and falls back to the safe default flow', () => {
    const resolution = resolveBookingSectionFlow(
      ['service', 'date', 'slot', 'customer', 'confirm'],
      { serviceId: 0 },
    );

    expect(resolution.usesFallback).toBe(true);
    expect(resolution.messageTone).toBe('error');
    expect(resolution.message).toMatch(/missing Resource/i);
    expect(resolution.supportedModes).toEqual(['slot']);
  });

  it('rejects a preselected service mode that is incompatible with the configured selection sections', () => {
    const resolution = resolveBookingSectionFlow(
      ['date', 'resource', 'slot', 'customer', 'confirm'],
      { serviceId: 42, selectedServiceMode: 'range' },
    );

    expect(resolution.usesFallback).toBe(true);
    expect(resolution.messageTone).toBe('error');
    expect(resolution.message).toMatch(/only supports slot-based services/i);
    expect(resolution.runtimeOrder).toEqual(
      getDefaultBookingFlowResolution(42, 'slot').runtimeOrder,
    );
  });
});

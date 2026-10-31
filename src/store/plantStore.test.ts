import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlant, payload } from './plantStore.ts';
test('failure latches, telemetry preserves fault, reset restores operation', () => {
  usePlant.getState().reset(); usePlant.getState().fail(); const faultAt = usePlant.getState().faultAt;
  usePlant.getState().toggle(); usePlant.getState().tick(); usePlant.getState().fail();
  const s = usePlant.getState(); assert.equal(s.mode, 'FAULT'); assert.equal(s.readings.temperature, 85); assert.equal(s.readings.flow, 0); assert.equal(s.faultAt, faultAt); assert.equal(payload(s).status, 'FAULT');
  assert.deepEqual(payload(s).readings, { temperatureC: 85, pressureBar: .5, vibrationMms: 0, flowM3h: 0 });
  s.reset(); assert.equal(usePlant.getState().mode, 'RUNNING'); assert.equal(usePlant.getState().faultAt, null); assert.equal(usePlant.getState().readings.flow, 42.5);
});
test('manual stop freezes tank levels and stops flow, restart restores flow', () => {
  usePlant.getState().reset(); usePlant.getState().toggle(); const before = usePlant.getState(); before.tick(); const after = usePlant.getState();
  assert.equal(after.mode, 'STOPPED'); assert.equal(after.readings.flow, 0); assert.equal(after.readings.rawLevel, before.readings.rawLevel); assert.equal(after.readings.storageLevel, before.readings.storageLevel);
  after.toggle(); assert.equal(usePlant.getState().mode, 'RUNNING'); assert.ok(usePlant.getState().readings.flow > 0);
});
test('equipment JSON mapping matches source readings after updates', () => {
  for (const id of ['T-101', 'P-101', 'F-101', 'T-102'] as const) {
    usePlant.getState().select(id); usePlant.getState().tick(); const s = usePlant.getState(); const p = payload(s);
    assert.equal(p.equipmentId, id); assert.equal(p.timestamp, s.timestamp); assert.equal(p.sequence, s.sequence);
    if (id === 'T-101') assert.equal(p.readings.levelPct, s.readings.rawLevel);
    if (id === 'T-102') assert.equal(p.readings.levelPct, s.readings.storageLevel);
    if (id === 'F-101') assert.equal(p.readings.inletPressureBar, s.readings.inletPressure);
    if (id === 'P-101') assert.equal(p.readings.temperatureC, s.readings.temperature);
  }
});

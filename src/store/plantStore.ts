import { create } from 'zustand';

export type EquipmentId = 'T-101' | 'P-101' | 'F-101' | 'T-102';
export type Mode = 'RUNNING' | 'STOPPED' | 'FAULT';
export const equipment = [
  { id: 'T-101', name: 'Raw water tank', type: 'Level transmitter', tag: 'LT_101', unit: '%', position: [-4, 0, -1] },
  { id: 'P-101', name: 'Transfer pump', type: 'Motor & temperature sensor', tag: 'TT_101', unit: '°C', position: [-1.5, 0, 2.5] },
  { id: 'F-101', name: 'Filtration unit', type: 'Pressure transmitter', tag: 'PT_201', unit: 'bar', position: [2, 0, -1.3] },
  { id: 'T-102', name: 'Storage tank', type: 'Level transmitter', tag: 'LT_102', unit: '%', position: [5, 0, 1.5] },
] as const;
export interface Telemetry { rawLevel: number; storageLevel: number; temperature: number; pressure: number; vibration: number; flow: number; inletPressure: number; outletPressure: number }
interface PlantState {
  selected: EquipmentId; mode: Mode; readings: Telemetry; timestamp: string; faultAt: string | null; sequence: number; viewReset: number;
  select: (id: EquipmentId) => void; tick: () => void; toggle: () => void; fail: () => void; reset: () => void; resetView: () => void;
}
const baseline = (): Telemetry => ({ rawLevel: 68, storageLevel: 45, temperature: 42, pressure: 4.5, vibration: 1.2, flow: 42.5, inletPressure: 4.2, outletPressure: 3.8 });
const now = () => new Date().toISOString();
const jitter = (center: number, range: number) => Math.round((center + (Math.random() - .5) * range) * 10) / 10;
const stopped = { pressure: .5, vibration: 0, flow: 0, inletPressure: 0, outletPressure: 0 };
export const usePlant = create<PlantState>((set) => ({
  selected: 'P-101', mode: 'RUNNING', readings: baseline(), timestamp: now(), faultAt: null, sequence: 1, viewReset: 0,
  select: selected => set({ selected }),
  tick: () => set(s => ({ timestamp: now(), sequence: s.sequence + 1, readings: {
    rawLevel: s.mode === 'RUNNING' ? jitter(68, .8) : s.readings.rawLevel,
    storageLevel: s.mode === 'RUNNING' ? jitter(45, .6) : s.readings.storageLevel,
    temperature: s.mode === 'FAULT' ? 85 : s.mode === 'RUNNING' ? jitter(42, 2) : Math.max(25, s.readings.temperature - .3),
    ...(s.mode === 'RUNNING' ? { pressure: jitter(4.5, .2), vibration: jitter(1.2, .2), flow: jitter(42.5, 1), inletPressure: jitter(4.2, .2), outletPressure: jitter(3.8, .2) } : stopped),
  }})),
  toggle: () => set(s => s.mode === 'FAULT' ? {} : { mode: s.mode === 'RUNNING' ? 'STOPPED' : 'RUNNING', readings: s.mode === 'RUNNING' ? { ...s.readings, ...stopped } : { ...baseline(), rawLevel: s.readings.rawLevel, storageLevel: s.readings.storageLevel }, timestamp: now(), sequence: s.sequence + 1 }),
  fail: () => set(s => s.mode === 'FAULT' ? {} : { mode: 'FAULT', selected: 'P-101', faultAt: now(), timestamp: now(), sequence: s.sequence + 1, readings: { ...s.readings, ...stopped, temperature: 85 } }),
  reset: () => set(s => ({ mode: 'RUNNING', readings: baseline(), faultAt: null, timestamp: now(), sequence: s.sequence + 1 })),
  resetView: () => set(s => ({ viewReset: s.viewReset + 1 })),
}));
export function statusOf(id: EquipmentId, mode: Mode) { return id === 'P-101' ? mode : id === 'F-101' ? mode === 'RUNNING' ? 'RUNNING' : 'IDLE' : 'ONLINE'; }
export function payload(s: Pick<PlantState, 'readings' | 'timestamp' | 'sequence' | 'mode' | 'selected'>) {
  const r = s.readings;
  const readings = s.selected === 'T-101' ? { levelPct: r.rawLevel } : s.selected === 'T-102' ? { levelPct: r.storageLevel } : s.selected === 'F-101' ? { inletPressureBar: r.inletPressure, outletPressureBar: r.outletPressure, flowM3h: r.flow } : { temperatureC: r.temperature, pressureBar: r.pressure, vibrationMms: r.vibration, flowM3h: r.flow };
  return { source: 'PLC-01', gateway: 'EDGE-01', protocol: 'MQTT', topic: `aquavex/water/${s.selected}`, equipmentId: s.selected, timestamp: s.timestamp, sequence: s.sequence, simulated: true, quality: 'GOOD', status: statusOf(s.selected, s.mode), readings };
}

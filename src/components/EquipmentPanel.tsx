import { useState } from 'react';
import { Activity, ArrowUpRight, ChevronRight, CircleGauge, Clock3, Cpu, Droplets, Info, Power, RotateCcw, ShieldCheck, Thermometer, TriangleAlert, UserRound, Waves } from 'lucide-react';
import { equipment, statusOf, usePlant } from '../store/plantStore';
export default function EquipmentPanel({ openFlow }: { openFlow: () => void }) {
  const s = usePlant(), e = equipment.find(e => e.id === s.selected)!, r = s.readings;
  const [tab, setTab] = useState('Live data');
  const fault = e.id === 'P-101' && s.mode === 'FAULT', pump = e.id === 'P-101', tank = e.id.startsWith('T');
  const status = statusOf(e.id, s.mode);
  const rows = pump ? [
    { icon: Thermometer, name: 'Temperature', value: r.temperature.toFixed(1), unit: '°C', bad: fault },
    { icon: CircleGauge, name: 'Pressure', value: r.pressure.toFixed(1), unit: 'bar' },
    { icon: Activity, name: 'Vibration', value: r.vibration.toFixed(1), unit: 'mm/s' },
    { icon: Waves, name: 'Flow rate', value: r.flow.toFixed(1), unit: 'm³/h' },
    { icon: ShieldCheck, name: 'Health', value: fault ? '20' : '96', unit: '%', bad: fault },
  ] : tank ? [{ icon: Droplets, name: 'Water level', value: (e.id === 'T-101' ? r.rawLevel : r.storageLevel).toFixed(1), unit: '%' }, { icon: ShieldCheck, name: 'Sensor health', value: '100', unit: '%' }] : [
    { icon: CircleGauge, name: 'Inlet pressure', value: r.inletPressure.toFixed(1), unit: 'bar' },
    { icon: CircleGauge, name: 'Outlet pressure', value: r.outletPressure.toFixed(1), unit: 'bar' },
    { icon: Waves, name: 'Flow rate', value: r.flow.toFixed(1), unit: 'm³/h' },
  ];
  return <aside className="equipment-panel">
    <div className="panel-kicker"><span>EQUIPMENT INSPECTOR</span><span className="mono">0{equipment.findIndex(item => item.id === s.selected) + 1} / 04</span></div>
    <div className="equipment-title"><div className={'equipment-symbol ' + (fault ? 'danger' : '')}>{tank ? <Droplets size={25}/> : pump ? <Activity size={25}/> : <CircleGauge size={25}/>}</div><div><h2>{e.id}</h2><p>{e.name}</p></div><span className={'status ' + (fault ? 'fault' : status === 'STOPPED' || status === 'IDLE' ? 'idle' : '')}>{status}</span></div>
    <div className={'equipment-illustration ' + (fault ? 'fault' : '')}>
      <div className="blueprint-grid"/><svg viewBox="0 0 320 105" role="img" aria-label={e.name + ' schematic'}>
        {pump ? <g fill="none" stroke="currentColor" strokeWidth="2"><path d="M24 64h43m-23-8v16m23-31v44m0-44h36v44H67m36-50h117v48H103zM112 39v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40m9-40v40M220 45h24v32h-24M85 41V22h33v12M117 83v10h90V83M57 94h195"/><circle cx="86" cy="63" r="13"/><path d="M167 35V24h23v11"/></g> : tank ? <g fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="160" cy="22" rx="48" ry="10"/><path d="M112 22v65c0 14 96 14 96 0V22"/><path d="M113 54c20 12 75 12 94 0v32c-10 12-80 12-94 0z" fill="currentColor" opacity=".2"/><path d="M220 20v75m12-75v75m-12-65h12m-12 13h12m-12 13h12m-12 13h12m-12 13h12M78 80h34m96 0h40"/></g> : <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="80" y="28" width="160" height="53" rx="22"/><path d="M105 28v53m110-53v53M20 55h60m160 0h60M115 82v13m90-13v13m-45-67V15"/><circle cx="160" cy="12" r="8"/></g>}
      </svg><span className="schematic-caption">ASSET SCHEMATIC · {e.id}</span><span className="signal-pip"><i className={'dot ' + (fault ? 'red' : '')}/> {fault ? 'Fault detected' : 'Telemetry online'}</span>
    </div>
    <div className="tabs" role="tablist" aria-label="Equipment details">{['Live data', 'Details'].map(t => <button role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Live data' ? <div className="readings">{rows.map(({ icon: Icon, name, value, unit, bad }) => <div className="reading" key={name}><span><Icon size={16}/>{name}</span><strong className={bad ? 'red-text' : ''}>{value}<small>{unit}</small></strong></div>)}</div> : <div className="details"><p><span>Asset type</span><strong>{e.type}</strong></p><p><span>Location</span><strong>Water treatment · Zone A</strong></p><p><span>PLC tag</span><code>{e.tag}</code></p><p><span>Controller</span><strong>PLC-01 · Rack 01</strong></p><p><span>Update interval</span><strong>2 seconds</strong></p><p><span>Mode</span><strong>Browser simulation</strong></p></div>}
    <div className="updated"><span><Clock3 size={12}/> {new Date(s.timestamp).toLocaleTimeString()}</span><span><i className="dot"/> Live · simulated</span></div>
    {fault ? <section className="alarm-card" role="alert"><div className="alarm-heading"><TriangleAlert size={16}/><strong>Pump overheating</strong><span>CRITICAL</span></div><p>Temperature exceeded the 80°C demo limit. Pump stopped automatically.</p><dl><dt><UserRound size={13}/> Assigned to</dt><dd>Alex Morgan (Demo)<small>Plant Maintenance</small></dd><dt><Clock3 size={13}/> Detected</dt><dd>{new Date(s.faultAt!).toLocaleTimeString()}</dd></dl><div className="recommendation">Inspect motor cooling system.</div></section> : <div className="healthy-card"><ShieldCheck size={19}/><div><strong>{s.mode === 'STOPPED' ? 'Pump manually stopped' : 'Operating within safe limits'}</strong><p>{s.mode === 'STOPPED' ? 'Water transfer is paused. Sensors remain online.' : 'No active alarms for this equipment.'}</p></div></div>}
    <button className="source-link" onClick={openFlow}><Cpu size={17}/><span><small>DATA SOURCE</small><strong>PLC-01 <ChevronRight size={12}/> EDGE-01</strong></span><ArrowUpRight size={17}/></button>
    {pump && <div className="control-section"><div className="section-label">SIMULATED CONTROL <Info size={12}/></div><button role="switch" aria-checked={s.mode === 'RUNNING'} aria-label="Pump power" className="power-control" onClick={s.toggle} disabled={fault}><Power size={17}/><span>{fault ? 'Pump locked · fault active' : s.mode === 'RUNNING' ? 'Pump running' : 'Pump stopped'}</span><i className={'toggle ' + (s.mode === 'RUNNING' ? 'on' : '')}/></button></div>}
    <button className="reset-button" onClick={s.reset}><RotateCcw size={15}/> Reset simulation</button>
  </aside>;
}

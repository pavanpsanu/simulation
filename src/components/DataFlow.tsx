import { useState } from 'react';
import { ArrowRight, Check, Cpu, Database, Gauge, Network, Radio, Server, Workflow } from 'lucide-react';
import { equipment, payload, usePlant, type EquipmentId } from '../store/plantStore';
const stages = [
  { title: 'Field sensors', sub: 'Physical measurement', icon: Gauge, protocol: '4–20 mA / digital I/O', detail: 'Temperature, pressure, vibration and level sensors provide example analog readings. In this demo a browser timer generates the values.' },
  { title: 'PLC-01', sub: 'Control & acquisition', icon: Cpu, protocol: 'OPC UA · tag read', detail: 'A simulated programmable logic controller groups the sensor tags and motor state. Real systems would scan wired I/O; this demo updates every 2 seconds.' },
  { title: 'EDGE-01', sub: 'Normalize & translate', icon: Server, protocol: 'MQTT · JSON publish', detail: 'The example gateway maps PLC tag names to readable JSON fields and attaches a timestamp, equipment ID and quality flag.' },
  { title: 'MQTT broker', sub: 'Topic-based delivery', icon: Radio, protocol: 'Local subscription', detail: 'Illustrates messages on aquavex/water/{equipmentId}. There is no network broker or socket connection; messages are derived locally from the shared state.' },
  { title: 'PlantVista', sub: 'Visualize & respond', icon: Workflow, protocol: '3D + live telemetry', detail: 'The scene, inspector, alarms and JSON viewer read the same Zustand store. A fault stops pump rotation and water flow while telemetry continues.' },
];
export default function DataFlow() {
  const s = usePlant(), [active, setActive] = useState(2);
  const packet = payload(s), e = equipment.find(e => e.id === s.selected)!;
  return <div className="data-flow">
    <div className="flow-heading"><div><span className="eyebrow">FROM FIELD TO SCREEN</span><h2>Every reading has a story.</h2><p>Explore how industrial data reaches your digital plant.</p></div><span className="simulation-badge"><i className="dot"/> SIMULATED PIPELINE</span></div>
    <div className="flow-stages">{stages.map((stage, i) => <div className="stage-wrap" key={stage.title}><button onClick={() => setActive(i)} className={'flow-stage ' + (active === i ? 'active' : '')} aria-pressed={active === i}><span className="stage-number">0{i + 1}</span><stage.icon size={26}/><strong>{stage.title}</strong><small>{stage.sub}</small><span className="stage-protocol">{stage.protocol}</span></button>{i < 4 && <ArrowRight className="flow-arrow" size={17}/>}</div>)}</div>
    <div className="stage-description"><Network size={20}/><div><strong>{stages[active].title}</strong><p>{stages[active].detail}</p></div></div>
    <div className="flow-columns single"><section className="flow-box"><div className="box-heading"><Database size={17}/><h3>Source & tag mapping</h3></div><label className="asset-select">EQUIPMENT<select value={s.selected} onChange={ev => s.select(ev.target.value as EquipmentId)}>{equipment.map(e => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}</select></label><div className="connection-row"><span>Controller</span><strong>PLC-01 <i className="dot"/></strong></div><div className="connection-row"><span>Example OPC UA node</span><code>ns=2;s={e.id}.{e.tag}</code></div><div className="mapping-table"><div><span>PLC TAG</span><span>DATA FIELD</span><span>VALUE</span></div>{Object.entries(packet.readings).map(([key, value], i) => <div key={key}><code>{key === 'temperatureC' || key === 'levelPct' || key === 'inletPressureBar' ? e.tag : ({ pressureBar: 'PT_101', vibrationMms: 'VT_101', flowM3h: 'FT_101', outletPressureBar: 'PT_202' } as Record<string, string>)[key] || 'TAG_' + i}</code><span>{key}</span><strong>{value}</strong></div>)}</div><div className="connector-note"><Check size={16}/><span>Good quality · updated every 2s<br/><small>Example protocols. No live industrial connections.</small></span></div></section></div>
  </div>;
}

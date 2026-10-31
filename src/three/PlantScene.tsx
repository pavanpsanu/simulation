import { Component, Suspense, createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { equipment, usePlant, type EquipmentId } from '../store/plantStore';
type V3 = [number, number, number];
const steel = '#8296a2';
const LabelPortal = createContext<RefObject<HTMLDivElement | null>>({ current: null });
function Box({ at, size, color = steel, metal = .65 }: { at: V3; size: V3; color?: string; metal?: number }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={metal} roughness={.4}/></mesh>;
}
function Cylinder({ at, radius, height, color = steel, rotation }: { at: V3; radius: number; height: number; color?: string; rotation?: V3 }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[radius, radius, height, 40]}/><meshStandardMaterial color={color} metalness={.75} roughness={.3}/></mesh>;
}
function Ring({ at, radius, color = steel, rotation }: { at: V3; radius: number; color?: string; rotation?: V3 }) {
  return <mesh position={at} rotation={rotation ?? [Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[radius, .035, 8, 56]}/><meshStandardMaterial color={color} metalness={.65} roughness={.3}/></mesh>;
}
function LinePipe({ a, b, radius = .12, color = steel }: { a: V3; b: V3; radius?: number; color?: string }) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  return <mesh position={start.add(end).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize())} castShadow><cylinderGeometry args={[radius, radius, delta.length(), 20]}/><meshStandardMaterial color={color} metalness={.8} roughness={.26}/></mesh>;
}
function Pipeline({ points }: { points: V3[] }) {
  const particles = useRef<THREE.Group>(null), elapsed = useRef(0); const mode = usePlant(s => s.mode);
  const path = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .05), [points]);
  useFrame((_, dt) => { if (mode === 'RUNNING') elapsed.current += dt; particles.current?.children.forEach((p, i) => p.position.copy(path.getPointAt((elapsed.current * .12 + i / 10) % 1))); });
  return <group><mesh castShadow><tubeGeometry args={[path, 64, .14, 12, false]}/><meshStandardMaterial color="#678594" metalness={.8} roughness={.25}/></mesh>
    {points.slice(1, -1).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[.175, 16, 12]}/><meshStandardMaterial color="#a6bac5" metalness={.8} roughness={.25}/></mesh>)}
    <group ref={particles}>{Array.from({ length: 10 }, (_, i) => <mesh key={i}><sphereGeometry args={[.17, 12, 8]}/><meshStandardMaterial color="#35d8fd" emissive="#00b7ff" emissiveIntensity={mode === 'RUNNING' ? 2 : .1} transparent opacity={mode === 'RUNNING' ? .85 : .2}/></mesh>)}</group>
  </group>;
}
function Label({ id, at }: { id: EquipmentId; at: V3 }) {
  const portal = useContext(LabelPortal);
  const s = usePlant(), e = equipment.find(e => e.id === id)!; const fault = id === 'P-101' && s.mode === 'FAULT';
  const value = id === 'T-101' ? s.readings.rawLevel.toFixed(1) + '% level' : id === 'T-102' ? s.readings.storageLevel.toFixed(1) + '% level' : id === 'F-101' ? s.readings.outletPressure.toFixed(1) + ' bar outlet' : s.readings.temperature.toFixed(1) + '°C · ' + s.mode.toLowerCase();
  return <Html portal={portal as RefObject<HTMLElement>} position={at} center zIndexRange={[20, 0]}><button className={'scene-label ' + (s.selected === id ? 'selected ' : '') + (fault ? 'fault' : '')} onClick={() => s.select(id)}><span className={'dot ' + (fault ? 'red' : '')}/><span><strong>{id}</strong><small>{e.name}</small><em>{value}</em></span></button></Html>;
}
function Selectable({ id, position, children }: { id: EquipmentId; position: V3; children: ReactNode }) {
  const selected = usePlant(s => s.selected), mode = usePlant(s => s.mode), select = usePlant(s => s.select); const [hovered, hover] = useState(false);
  const pulse = useRef<THREE.Mesh>(null), pulseMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const isSelected = selected === id, faultSelected = id === 'P-101' && mode === 'FAULT';
  useFrame(state => {
    if (!pulse.current || !pulseMaterial.current || !isSelected) return;
    const wave = (Math.sin(state.clock.elapsedTime * 3.4) + 1) / 2;
    const scale = .92 + wave * .22;
    pulse.current.scale.set(scale, scale, scale);
    pulseMaterial.current.opacity = .28 + wave * .58;
  });
  const choose = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); select(id); };
  return <group position={position} onClick={choose} onPointerOver={e => { e.stopPropagation(); hover(true); }} onPointerOut={() => hover(false)}>
    {children}
    {(isSelected || hovered) && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .075, 0]}><ringGeometry args={[1.55, 1.68, 64]}/><meshBasicMaterial color={faultSelected ? '#ff3344' : '#55dcff'} transparent opacity={isSelected ? 1 : .55} depthWrite={false}/></mesh>}
    {isSelected && <>
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, .09, 0]}><ringGeometry args={[1.82, 1.94, 64]}/><meshBasicMaterial ref={pulseMaterial} color={faultSelected ? '#ff3045' : '#18cfff'} transparent opacity={.65} depthWrite={false}/></mesh>
      <pointLight position={[0, 2.2, 0]} color={faultSelected ? '#ff263d' : '#22cfff'} intensity={faultSelected ? 8 : 5} distance={5.5}/>
    </>}
  </group>;
}
function Tank({ id, position, level }: { id: 'T-101' | 'T-102'; position: V3; level: number }) {
  const water = useRef<THREE.Mesh>(null), surface = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (water.current) { water.current.scale.y = THREE.MathUtils.damp(water.current.scale.y, 3.45 * level / 100, 3, dt); water.current.position.y = .3 + water.current.scale.y / 2; if (surface.current) surface.current.position.y = .3 + water.current.scale.y; } });
  return <Selectable id={id} position={position}>
    <Cylinder at={[0, .15, 0]} radius={1.45} height={.3} color="#344654"/>
    <mesh position={[0, 2.1, 0]} castShadow><cylinderGeometry args={[1.23, 1.23, 3.6, 56, 1, true]}/><meshPhysicalMaterial color="#a0c2cf" metalness={.45} roughness={.25} transparent opacity={.22} side={THREE.DoubleSide} depthWrite={false}/></mesh>
    <mesh ref={water} position={[0, 1.4, 0]} scale={[1, 3.45 * level / 100, 1]}><cylinderGeometry args={[1.18, 1.18, 1, 48]}/><meshStandardMaterial color="#049dd4" emissive="#036b9a" emissiveIntensity={.5} metalness={.3} roughness={.18} transparent opacity={.78}/></mesh>
    <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, .3 + 3.45 * level / 100, 0]}><circleGeometry args={[1.18, 48]}/><meshStandardMaterial color="#4cdefb" metalness={.4} roughness={.2}/></mesh>
    <Cylinder at={[0, 3.6, 0]} radius={1.24} height={.65}/><Cylinder at={[0, 3.95, 0]} radius={1.24} height={.18}/><Cylinder at={[0, 4.13, 0]} radius={.32} height={.2} color="#3a5263"/>
    {[.35, 1.5, 2.7, 3.8].map(y => <Ring key={y} at={[0, y, 0]} radius={1.26}/>)}
    {Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return <Box key={i} at={[Math.cos(a) * 1.24, 2.1, Math.sin(a) * 1.24]} size={[.035, 3.6, .035]} color="#6c8492"/>; })}
    {[-.32, .32].map(x => <Box key={x} at={[x, 2.25, 1.33]} size={[.055, 4.3, .055]} color="#e9b344"/>)}
    {Array.from({ length: 13 }, (_, i) => <Box key={i} at={[0, .35 + i * .32, 1.33]} size={[.65, .035, .07]} color="#e9b344"/>)}
    <Ring at={[0, 4.45, 0]} radius={1.3} color="#e9b344"/>
    {Array.from({ length: 12 }, (_, i) => <Box key={i} at={[Math.sin(i * Math.PI / 6) * 1.3, 4.2, Math.cos(i * Math.PI / 6) * 1.3]} size={[.035, .5, .035]} color="#e9b344"/>)}
    <Label id={id} at={id === 'T-101' ? [-.6, 5.1, 0] : [1, 5.1, 0]}/>
  </Selectable>;
}
function Pump() {
  const mode = usePlant(s => s.mode), rotor = useRef<THREE.Group>(null), beacon = useRef<THREE.MeshStandardMaterial>(null), lamp = useRef<THREE.PointLight>(null);
  useFrame((state, dt) => { if (rotor.current && mode === 'RUNNING') rotor.current.rotation.x += dt * 9; const flash = mode === 'FAULT' ? Math.sin(state.clock.elapsedTime * 8) > 0 ? 5 : .25 : 1; if (beacon.current) beacon.current.emissiveIntensity = flash; if (lamp.current) lamp.current.intensity = mode === 'FAULT' ? flash * 3 : 0; });
  const color = mode === 'FAULT' ? '#a92734' : '#166797';
  return <Selectable id="P-101" position={[-1.5, 0, 2.5]}>
    <Box at={[0, .18, 0]} size={[3, .3, 1.65]} color="#3c4850"/>
    {[-1.1, 1.1].flatMap(x => [-.65, .65].map(z => <Cylinder key={x + ':' + z} at={[x, .37, z]} radius={.09} height={.1} color="#d2b05d"/>))}
    <Box at={[.3, .5, 0]} size={[1.4, .4, .75]} color={color}/><Cylinder at={[.45, .95, 0]} radius={.5} height={1.5} rotation={[0, 0, Math.PI / 2]} color={color}/>
    {Array.from({ length: 12 }, (_, i) => <Cylinder key={i} at={[-.15 + i * .1, .95, 0]} radius={.53} height={.035} rotation={[0, 0, Math.PI / 2]} color={color}/>)}
    <Cylinder at={[-.95, .92, 0]} radius={.62} height={.45} rotation={[0, 0, Math.PI / 2]} color={color}/><Cylinder at={[-1.28, .92, 0]} radius={.27} height={.3} rotation={[0, 0, Math.PI / 2]}/><Cylinder at={[-.95, 1.5, 0]} radius={.19} height={.5}/><Cylinder at={[-.95, 1.75, 0]} radius={.3} height={.08}/>
    <group ref={rotor} position={[1.22, .95, 0]}>{[0, 1, 2, 3, 4, 5].map(i => <group key={i} rotation={[i * Math.PI / 3, 0, 0]}><Box at={[0, .23, 0]} size={[.07, .39, .13]} color="#b6d1dd"/></group>)}</group>
    <Box at={[.25, 1.5, 0]} size={[.5, .25, .45]} color={color}/><Cylinder at={[.25, 1.8, 0]} radius={.16} height={.12} color="#252f3a"/>
    <mesh position={[.25, 2, 0]}><capsuleGeometry args={[.13, .2, 8, 16]}/><meshStandardMaterial ref={beacon} color={mode === 'FAULT' ? '#ff303e' : '#3ce2a0'} emissive={mode === 'FAULT' ? '#ff1225' : '#13d594'}/></mesh>
    <pointLight ref={lamp} position={[.25, 2.4, 0]} color="#ff2030" distance={6}/><Label id="P-101" at={[.3, 2.95, .2]}/>
  </Selectable>;
}
function Filter() {
  return <Selectable id="F-101" position={[2, 0, -1.3]}>
    <Box at={[0, .12, 0]} size={[2.8, .24, 2]} color="#384854"/>{[-.8, .8].map(x => <Box key={x} at={[x, .55, 0]} size={[.22, .9, 1.1]} color="#365367"/>)}
    <Cylinder at={[0, 1.55, 0]} radius={.8} height={2.25} rotation={[0, 0, Math.PI / 2]}/>
    {[-1.15, -.7, .7, 1.15].map(x => <Cylinder key={x} at={[x, 1.55, 0]} radius={.85} height={.08} rotation={[0, 0, Math.PI / 2]}/>)}
    <Cylinder at={[0, 2.45, 0]} radius={.18} height={.4}/><mesh position={[0, 2.7, .1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.24, .24, .1, 24]}/><meshStandardMaterial color="#e7edf1"/></mesh><Box at={[0, 2.73, .17]} size={[.025, .15, .025]} color="#173347"/><Label id="F-101" at={[-1.2, 4, -1]}/>
  </Selectable>;
}
function Site() {
  return <group>
    <Box at={[0, -.23, 0]} size={[15, .5, 10]} color="#33434b" metal={.1}/>
    {Array.from({ length: 11 }, (_, i) => <Box key={i} at={[-7.4 + i * 1.48, .025, 0]} size={[.018, .01, 9.9]} color="#50616a" metal={0}/>)}
    {Array.from({ length: 8 }, (_, i) => <Box key={i} at={[0, .027, -4.9 + i * 1.4]} size={[14.9, .01, .018]} color="#50616a" metal={0}/>)}
    <Box at={[0, .04, 4.3]} size={[14, .02, .045]} color="#ddaf49"/>
    {Array.from({ length: 15 }, (_, i) => <Box key={i} at={[-7 + i, .55, -4.6]} size={[.045, 1.1, .045]} color="#d7ad4b"/>)}
    {[.55, 1.05].map(y => <LinePipe key={y} a={[-7, y, -4.6]} b={[7, y, -4.6]} radius={.025} color="#d7ad4b"/>)}
    <Box at={[1, 1.3, -4]} size={[4.2, 2.5, 1]} color="#485a65" metal={.2}/><Box at={[1, 2.6, -4]} size={[4.5, .15, 1.3]} color="#72818b"/>
    {[-.3, 1.1, 2.4].map(x => <group key={x}><Box at={[x, 1.35, -3.47]} size={[.85, 1.6, .08]} color="#263c4a"/><Box at={[x, 1.8, -3.41]} size={[.5, .3, .03]} color="#39c4a2"/>{[.8, 1, 1.2].map(y => <Box key={y} at={[x, y, -3.4]} size={[.55, .035, .03]} color="#667f8c"/>)}</group>)}
    {[-6.5, 6.5].map(x => <group key={x}><Cylinder at={[x, 1.8, -3.7]} radius={.055} height={3.6}/><Box at={[x, 3.65, -3.7]} size={[.5, .12, .25]} color="#d9eff8"/><pointLight position={[x, 3.5, -3.7]} intensity={12} color="#c2e9ff" distance={8}/></group>)}
    {[-4, 0, 4].map(x => <group key={x}><Box at={[x, .4, 3.85]} size={[.08, .8, .08]} color="#6a8293"/><LinePipe a={[x - .35, .8, 3.85]} b={[x + .35, .8, 3.85]} radius={.04}/></group>)}
    <LinePipe a={[-6, .9, 3.85]} b={[6, .9, 3.85]} radius={.09} color="#688d9d"/>
  </group>;
}
const paths: V3[][] = [
  [[-4, .92, .1], [-4, .92, 2.5], [-2.78, .92, 2.5]],
  [[-2.45, 1.75, 2.5], [-2.45, 2.1, 2.5], [-.2, 2.1, 2.5], [-.2, 2.1, -1.3], [.85, 1.55, -1.3]],
  [[3.15, 1.55, -1.3], [5, 1.55, -1.3], [5, 1.55, .3]],
];
function Camera() {
  const ref = useRef<OrbitControlsImpl>(null), selected = usePlant(s => s.selected), reset = usePlant(s => s.viewReset), { camera, size } = useThree();
  useEffect(() => { if (camera instanceof THREE.PerspectiveCamera) { camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) * Math.max(1, 1.5 / (size.width / size.height)))); camera.updateProjectionMatrix(); } }, [camera, size.width, size.height]);
  const destination = useRef(new THREE.Vector3(0, 1, 0)), camDestination = useRef(new THREE.Vector3(10, 10, 15)), moving = useRef(false), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const e = equipment.find(e => e.id === selected)!; destination.current.set(e.position[0] * .3, 1.2, e.position[2] * .3); camDestination.current.copy(destination.current).add(new THREE.Vector3(10, 9, 15)); moving.current = true; }, [selected]);
  useEffect(() => { destination.current.set(0, 1, 0); camDestination.current.set(10, 10, 15); moving.current = true; }, [reset]);
  useFrame((_, dt) => { if (!moving.current || !ref.current) return; const alpha = 1 - Math.exp(-dt * 4); camera.position.lerp(camDestination.current, alpha); ref.current.target.lerp(destination.current, alpha); ref.current.update(); if (camera.position.distanceTo(camDestination.current) < .02) moving.current = false; });
  return <OrbitControls ref={ref} makeDefault enableDamping minDistance={8} maxDistance={32} maxPolarAngle={Math.PI / 2.12} onStart={() => { moving.current = false; }}/>;
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><strong>3D view unavailable</strong><p>Enable WebGL or hardware acceleration to explore the plant. Telemetry, controls and Data Flow remain available.</p></div> : this.props.children; }
}
export default function PlantScene() {
  const readings = usePlant(s => s.readings); const labelPortal = useRef<HTMLDivElement>(null);
  return <SceneBoundary><LabelPortal.Provider value={labelPortal}><div className="canvas-wrapper"><div ref={labelPortal} className="plant-label-layer"/><Canvas shadows dpr={[1, 1.5]} camera={{ position: [13, 11, 16], fov: 42 }} gl={{ antialias: true }}><color attach="background" args={['#101e2a']}/><fog attach="fog" args={['#101e2a', 30, 65]}/><ambientLight intensity={.85}/><hemisphereLight args={['#ceeaff', '#273542', 1.5]}/><directionalLight position={[5, 12, 8]} intensity={3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-.001}/><directionalLight position={[-8, 5, -4]} color="#60bfff" intensity={2}/><Suspense fallback={null}><Site/><Tank id="T-101" position={[-4, 0, -1]} level={readings.rawLevel}/><Pump/><Filter/><Tank id="T-102" position={[5, 0, 1.5]} level={readings.storageLevel}/>{paths.map((points, i) => <Pipeline key={i} points={points}/>)}<ContactShadows position={[0, -.49, 0]} scale={25} opacity={.45} blur={2.5} far={7}/></Suspense><Camera/></Canvas></div></LabelPortal.Provider></SceneBoundary>;
}

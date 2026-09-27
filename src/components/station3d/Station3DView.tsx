import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Accessibility, ArrowLeftRight, DoorOpen, Box } from 'lucide-react';
import type { Language, LiveVehicle, Station } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { fmt, ui } from '../../i18n/ui';
import { LineBadge, StationSearch, waitLabel } from '../now/shared';
import { DataAttribution } from '../legal/DataAttribution';

type Layout = NonNullable<ReturnType<TmbNetwork['stationLayout']>>;

const KY = 110574;

function projector(center: [number, number]) {
  const kx = 111320 * Math.cos((center[0] * Math.PI) / 180);
  return (lat: number, lng: number): [number, number] => [(lng - center[1]) * kx, (center[0] - lat) * KY];
}

function label(text: string, cls: string) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return new CSS2DObject(el);
}

/**
 * The station in 3D with real data: street entrances (step-free vs stairs, lifts),
 * one platform per line at depth with its real track, official interchange walking
 * times, and the actual trains approaching from the timetable.
 */
export const Station3DView: React.FC<{
  network: TmbNetwork;
  station: Station | null;
  vehicles: LiveVehicle[];
  now: number;
  lang: Language;
  onPickStation: (s: Station) => void;
}> = ({ network, station, vehicles, now, lang, onPickStation }) => {
  const t = ui(lang);
  const metroStation = station && !station.isBusStop ? station : null;
  const layout = useMemo(() => (metroStation ? network.stationLayout(metroStation.id) : null), [network, metroStation]);
  const mountRef = useRef<HTMLDivElement>(null);
  const trainsRef = useRef<{ group: THREE.Group; depth: Map<string, number>; project: (lat: number, lng: number) => [number, number] } | null>(null);

  // ---------------------------------------------------------------- build scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !layout) return;
    const project = projector(layout.center);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);
    const labels = new CSS2DRenderer();
    labels.domElement.style.position = 'absolute';
    labels.domElement.style.inset = '0';
    labels.domElement.style.pointerEvents = 'none';
    mount.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    scene.fog = new THREE.Fog('#070b14', 700, 1600);
    const camera = new THREE.PerspectiveCamera(48, 1, 1, 4000);
    camera.position.set(170, 190, 240);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -18, 0);
    controls.enableDamping = true;
    controls.maxDistance = 900;
    controls.minDistance = 40;
    controls.maxPolarAngle = Math.PI * 0.62;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(-200, 400, 200);
    scene.add(sun);

    // Street level: translucent ground + grid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(1400, 56, 0x334155, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);

    // Platforms: one level per line
    const lines = [...new Set(layout.platforms.map((p) => p.lineCode))];
    const depth = new Map(lines.map((l, i) => [l, -16 - i * 11]));
    const platPos = new Map<number, THREE.Vector3>();
    layout.platforms.forEach((p) => {
      const y = depth.get(p.lineCode)!;
      const color = new THREE.Color(p.color);
      if (p.track.length > 1) {
        const pts = p.track.map(([la, lo]) => { const [x, z] = project(la, lo); return new THREE.Vector3(x, y - 2, z); });
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.1);
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(20, pts.length * 4), 1.6, 6, false), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 })));
      }
      const [x, z] = project(p.lat, p.lng);
      const [ax, az] = project(p.dirFrom[0], p.dirFrom[1]);
      const [bx, bz] = project(p.dirTo[0], p.dirTo[1]);
      const plat = new THREE.Mesh(new THREE.BoxGeometry(100, 1.5, 9), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      plat.position.set(x, y, z);
      plat.rotation.y = -Math.atan2(bz - az, bx - ax);
      scene.add(plat);
      platPos.set(p.stopIndex, new THREE.Vector3(x, y, z));
      const l = label(`${p.lineCode}${p.accessible ? ' ♿' : ''}`, 's3d-plat');
      l.element.style.setProperty('--c', p.color);
      l.position.set(x, y + 6, z);
      scene.add(l);
    });

    // Entrances: shafts from the street down to the nearest platform
    layout.accesses.forEach((a) => {
      const [x, z] = project(a.lat, a.lng);
      let nearest: THREE.Vector3 | null = null, nd = Infinity;
      platPos.forEach((v) => { const d = Math.hypot(v.x - x, v.z - z); if (d < nd) { nd = d; nearest = v; } });
      const bottom = nearest ? (nearest as THREE.Vector3).y : -16;
      const color = a.accessible ? 0x38bdf8 : 0x94a3b8;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, -bottom, 12), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 }));
      shaft.position.set(x, bottom / 2, z);
      scene.add(shaft);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 9), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
      cap.position.set(x, 1.5, z);
      scene.add(cap);
      if (nearest) {
        const n = nearest as THREE.Vector3;
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, bottom, z), new THREE.Vector3(n.x, n.y, n.z)]);
        const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 3 }));
        line.computeLineDistances();
        scene.add(line);
      }
      const l = label(`${a.accessible ? '♿ ' : ''}${a.name}${a.elevators ? ` · ${a.elevators}⇅` : ''}`, a.accessible ? 's3d-acc s3d-acc-ok' : 's3d-acc');
      l.position.set(x, 10, z);
      scene.add(l);
    });

    // Interchanges with the official walking time
    const seen = new Set<string>();
    layout.interchanges.forEach((ic) => {
      const key = [ic.a, ic.b].sort().join('-');
      if (seen.has(key)) return;
      seen.add(key);
      const A = platPos.get(ic.a), B = platPos.get(ic.b);
      if (!A || !B) return;
      const g = new THREE.BufferGeometry().setFromPoints([A, B]);
      const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 3, gapSize: 2 }));
      line.computeLineDistances();
      scene.add(line);
      const l = label(`${ic.from} ⇄ ${ic.to} · ${ic.secs < 60 ? `${ic.secs} s` : `${Math.round(ic.secs / 60)} min`}`, 's3d-ic');
      l.position.copy(A.clone().add(B).multiplyScalar(0.5));
      scene.add(l);
    });

    // Trains (updated from props)
    const trainGroup = new THREE.Group();
    scene.add(trainGroup);
    trainsRef.current = { group: trainGroup, depth, project };

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false);
      labels.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mount.removeChild(labels.domElement);
      trainsRef.current = null;
    };
  }, [layout]);

  // ---------------------------------------------------------------- trains near the station
  useEffect(() => {
    const ref = trainsRef.current;
    if (!ref || !layout || !metroStation) return;
    ref.group.children.slice().forEach((c) => {
      ref.group.remove(c);
      if (c instanceof CSS2DObject) c.element.remove();
      const m = c as THREE.Mesh;
      m.geometry?.dispose?.();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    vehicles.forEach((v) => {
      const y = ref.depth.get(v.lineCode);
      if (y === undefined) return;
      const [x, z] = ref.project(v.lat, v.lng);
      if (Math.hypot(x, z) > 480) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(70, 4.5, 4), new THREE.MeshStandardMaterial({ color: v.color, emissive: v.color, emissiveIntensity: 0.6 }));
      const b = (v.bearing * Math.PI) / 180;
      mesh.position.set(x, y + 3, z);
      mesh.rotation.y = -Math.atan2(-Math.cos(b), Math.sin(b));
      ref.group.add(mesh);
      if (v.nextStationId === metroStation.id) {
        const l = label(`${v.lineCode} → ${v.destination} · ${v.etaMinutes < 1 ? t.approaching : `${v.etaMinutes} ${t.min}`}`, 's3d-train');
        l.element.style.setProperty('--c', v.color);
        l.position.set(x, y + 10, z);
        ref.group.add(l);
      }
    });
  }, [vehicles, layout, metroStation, t]);

  const groups = useMemo(() => (metroStation ? network.departureGroups(metroStation.id, now, 2) : []), [network, metroStation, now]);

  // ---------------------------------------------------------------- station picker
  if (!metroStation || !layout) {
    const main = ['Catalunya', 'Passeig de Gràcia', 'Sagrada Família', 'Sants Estació', 'Espanya', 'Diagonal', 'La Sagrera', 'Aeroport T1']
      .map((n) => network.stations.find((s) => !s.isBusStop && s.name === n))
      .filter((s): s is Station => !!s);
    return (
      <div className="w-full h-full overflow-y-auto bg-slate-950">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-rose-400" /> {t.pickStation3d}
          </h2>
          <StationSearch network={network} metroOnly lang={lang} onPick={onPickStation} />
          <div className="grid grid-cols-2 gap-2">
            {main.map((s) => (
              <button key={s.id} onClick={() => onPickStation(s)} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="flex gap-1 mt-1">
                  {s.lines.map((l) => (
                    <LineBadge key={l} code={l} line={network.lines[network.lineIndexByCode.get(l) ?? -1]} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-slate-950">
      <div className="relative flex-1 min-h-[52vh]">
        <div ref={mountRef} className="absolute inset-0" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto px-3 py-2 rounded-xl bg-slate-900/85 border border-slate-700 backdrop-blur">
            <div className="text-sm font-extrabold text-white">{metroStation.name}</div>
            <div className="flex gap-1 mt-1">
              {metroStation.lines.map((l) => (
                <LineBadge key={l} code={l} line={network.lines[network.lineIndexByCode.get(l) ?? -1]} />
              ))}
            </div>
          </div>
          <div className="pointer-events-auto w-56 max-w-[45%]">
            <StationSearch network={network} metroOnly lang={lang} onPick={onPickStation} />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 bg-slate-900/80 rounded-lg px-2 py-1 flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> {t.stepFreeLegend}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> {t.stairsLegend}</span>
          <span className="hidden sm:inline">{t.drag3d}</span>
        </div>
      </div>

      <aside className="lg:w-96 shrink-0 overflow-y-auto max-h-[40vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-800 p-3 space-y-3 pb-20 lg:pb-3">
        <section className="space-y-1">
          {groups.slice(0, 6).map((g) => {
            const d = g[0];
            return (
              <div key={`${d.lineCode}|${d.destination}`} className="px-2 py-1.5 rounded-xl bg-slate-900 flex items-center gap-2">
                <LineBadge code={d.lineCode} line={network.lines[network.lineIndexByCode.get(d.lineCode) ?? -1]} />
                <span className="flex-1 text-xs text-slate-200 truncate">→ {d.destination}</span>
                <span className="font-tech text-sm font-bold text-white">{waitLabel(d.timeEstimateSeconds ?? 0, lang)}</span>
              </div>
            );
          })}
        </section>
        {layout.interchanges.length > 0 && (
          <section className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1"><ArrowLeftRight className="w-3.5 h-3.5" /> {t.interchanges}</h3>
            {layout.interchanges.map((ic, i) => (
              <div key={i} className="text-xs text-slate-300">
                {fmt(t.interchange, ic.from, ic.to, ic.secs < 60 ? `${ic.secs} s` : `${Math.round(ic.secs / 60)} min`)}
              </div>
            ))}
          </section>
        )}
        <section className="space-y-1">
          <h3 className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5" /> {t.entrances3d} ({layout.accesses.length})</h3>
          {layout.accesses.map((a) => (
            <div key={`${a.name}-${a.lat}`} className="text-xs flex items-center gap-1.5">
              {a.accessible ? <Accessibility className="w-3.5 h-3.5 text-sky-400" /> : <span className="w-3.5 h-3.5 inline-block rounded-sm bg-slate-600" />}
              <span className={a.accessible ? 'text-white' : 'text-slate-400'}>{a.name}</span>
              {a.elevators > 0 && <span className="text-emerald-400">· {a.elevators}⇅</span>}
            </div>
          ))}
        </section>
        <DataAttribution network={network} lang={lang} />
      </aside>
    </div>
  );
};

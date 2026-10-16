// Taktisk minikarta (0.12.0, H100): en militär lägeskarta. Mörk botten, gatorna som tunna linjer, ett
// svagt rutnät med koordinater (A, B, C ... och 1, 2, 3 ... per 20 m) och en ram i spelets plåtstil.
// Den visar den aktiva kartan, ingångarnas pilar, horden som röda prickar med ett svans som bleknar,
// pingar (förvarnade hus, barrikader som håller på att gå sönder), pjäserna och barrikaderna som små
// NATO-lika tecken, basen och kamerans ruta. Klick eller drag flyttar kameran. M slår av och på.
// Ritas med en billig 2D-canvas, ungefär 10 gånger i sekunden. Bara bild: läser simuleringen.
import { OBSTACLES } from '../data/obstacles.js';

const W = 236, H = 168, PAD = 8;
const GRID = 20;              // meter mellan rutnätets linjer
const HZ = 10;
const TRAIL = 6;              // så många gamla lägen per zombie
const C = {
  bg: '#14160f', grid: 'rgba(160,170,130,0.10)', label: 'rgba(200,205,170,0.45)', road: 'rgba(205,200,175,0.42)', path: 'rgba(205,200,175,0.25)',
  bldg: 'rgba(120,125,105,0.35)', edge: 'rgba(233,223,201,0.35)', horde: '#e0452c', own: '#8fc4e8', base: '#d9a441', block: '#d9a441', wire: 'rgba(217,164,65,0.7)',
  view: 'rgba(233,223,201,0.85)', ping: '#e0341e',
};

export function createMinimap(root, { onPan, visible = true } = {}) {
  const el = document.createElement('div');
  el.id = 'minimap'; el.className = 'plate';
  el.innerHTML = '<canvas></canvas><div class="mm-k">M</div>';
  root.appendChild(el);
  const cv = el.querySelector('canvas');
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d');
  let on = visible, acc = 0, mapRef = null, bounds = null, k = 1, ox = 0, oz = 0, staticLayer = null;
  const trails = new Map();     // zombie-id -> [[x, z], ...]
  let clock = 0;

  // Kartans utsnitt: den skarpa ytan med lite marginal (ingångarnas pilar syns vid kanten); E4 vägen.
  function setMap(map, sim) {
    mapRef = map; trails.clear();
    const c = map.surroundings?.crisp;
    if (c) bounds = { x0: c.x0 - 6, x1: c.x1 + 6, z0: c.z0 - 6, z1: c.z1 + 6 };
    else {
      const p = sim.place;
      bounds = { x0: p.origin[0], x1: p.origin[0] + p.w * p.size, z0: p.origin[1], z1: p.origin[1] + p.h * p.size };
    }
    k = Math.min((W - 2 * PAD) / (bounds.x1 - bounds.x0), (H - 2 * PAD) / (bounds.z1 - bounds.z0));
    ox = (W - (bounds.x1 - bounds.x0) * k) / 2; oz = (H - (bounds.z1 - bounds.z0) * k) / 2;
    staticLayer = drawStatic(map, sim);
  }
  const X = x => ox + (x - bounds.x0) * k, Z = z => oz + (z - bounds.z0) * k;
  const toWorld = (px, py) => ({ x: bounds.x0 + (px - ox) / k, z: bounds.z0 + (py - oz) / k });

  // Det som inte rör sig: botten, rutnätet, husen och gatorna. En egen canvas, ritad en gång per bana.
  function drawStatic(map, sim) {
    const s = document.createElement('canvas');
    s.width = W * dpr; s.height = H * dpr;
    const c = s.getContext('2d');
    c.scale(dpr, dpr);
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    // rutnätet med koordinater
    c.strokeStyle = C.grid; c.lineWidth = 1; c.fillStyle = C.label; c.font = '8px "IBM Plex Mono", monospace';
    const gx0 = Math.ceil(bounds.x0 / GRID) * GRID, gz0 = Math.ceil(bounds.z0 / GRID) * GRID;
    let n = 0;
    for (let x = gx0; x <= bounds.x1; x += GRID, n++) {
      c.beginPath(); c.moveTo(X(x) + 0.5, Z(bounds.z0)); c.lineTo(X(x) + 0.5, Z(bounds.z1)); c.stroke();
      if (n % 2 === 0) c.fillText(String.fromCharCode(65 + (n / 2) % 26), X(x) + 2, Z(bounds.z0) + 8);
    }
    n = 0;
    for (let z = gz0; z <= bounds.z1; z += GRID, n++) {
      c.beginPath(); c.moveTo(X(bounds.x0), Z(z) + 0.5); c.lineTo(X(bounds.x1), Z(z) + 0.5); c.stroke();
      if (n % 2 === 0) c.fillText(String(n / 2 + 1), X(bounds.x0) + 2, Z(z) - 2);
    }
    // husen
    c.fillStyle = C.bldg;
    for (const rects of sim.place.buildings ?? []) for (const r of rects) {
      c.save(); c.translate(X(r.x), Z(r.z)); c.transform(r.c, -r.s, r.s, r.c, 0, 0);
      c.fillRect(-r.hw * k, -r.hd * k, r.hw * 2 * k, r.hd * 2 * k);
      c.restore();
    }
    // gatorna
    c.lineCap = 'round'; c.lineJoin = 'round';
    const line = (pts, w, col) => {
      if (!pts?.length) return;
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.stroke();
    };
    if (map.roads) for (const r of map.roads) line(r.pts, r.walk ? Math.max(1, r.width * k * 0.5) : 0.8, r.surface === 'asphalt' ? C.road : C.path);
    else if (map.path) line(map.path, Math.max(2, 9 * k), C.road);
    // den aktiva kartans kant
    const cr = map.surroundings?.crisp;
    c.strokeStyle = C.edge; c.lineWidth = 1; c.setLineDash([3, 3]);
    if (cr) c.strokeRect(X(cr.x0), Z(cr.z0), (cr.x1 - cr.x0) * k, (cr.z1 - cr.z0) * k);
    c.setLineDash([]);
    return s;
  }

  // NATO-lika tecken: en rektangel; Hemvärnet ett kryss (infanteri), kulsprutor en prick, Psg 90 en
  // pil (prickskytt), Ak 5 ett kryss och en prick.
  function unit(x, y, kind, moving) {
    const w = 9, h = 6;
    g.strokeStyle = C.own; g.lineWidth = 1.2; g.fillStyle = 'rgba(20,40,60,0.85)';
    g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeRect(x - w / 2, y - h / 2, w, h);
    g.beginPath();
    if (kind === 'hv' || kind === 'ak5') { g.moveTo(x - w / 2, y - h / 2); g.lineTo(x + w / 2, y + h / 2); g.moveTo(x + w / 2, y - h / 2); g.lineTo(x - w / 2, y + h / 2); }
    if (kind === 'psg90') { g.moveTo(x - 2.5, y + 1.5); g.lineTo(x, y - 1.8); g.lineTo(x + 2.5, y + 1.5); }
    g.stroke();
    if (kind !== 'hv' && kind !== 'psg90') { g.fillStyle = C.own; g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill(); }
    if (moving) { g.strokeStyle = 'rgba(217,164,65,0.9)'; g.setLineDash([2, 2]); g.strokeRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4); g.setLineDash([]); }
  }
  function ping(x, y, t, col = C.ping) {
    const r = 3 + (t % 1.2) / 1.2 * 9, a = 1 - (t % 1.2) / 1.2;
    g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1; g.fillStyle = col; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
  }

  // state: { sim, view: [[x, z] x4] eller null, spawns: [id], alerts: [{ x, z, kind }] }
  function draw({ sim, view, spawns = [], alerts = [] }) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(staticLayer, 0, 0, W, H);
    // ingångarnas pilar: vid kanten av utsnittet, mot basen
    const base = sim.route.base;
    for (const id of spawns) {
      const sp = sim.route.spawns?.find(s => s.id === id);
      if (!sp) continue;
      const x = Math.min(bounds.x1 - 3, Math.max(bounds.x0 + 3, sp.x)), z = Math.min(bounds.z1 - 3, Math.max(bounds.z0 + 3, sp.z));
      const a = Math.atan2(base.z - z, base.x - x);
      g.save(); g.translate(X(x), Z(z)); g.rotate(a);
      g.fillStyle = C.horde; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4.5); g.lineTo(-1.5, 0); g.lineTo(-4, 4.5); g.closePath(); g.fill();
      g.restore();
    }
    if (!sim.route.spawns && sim.map.path) {
      const [x, z] = sim.map.path[0];
      g.fillStyle = C.horde; g.beginPath(); g.moveTo(X(x) - 6, Z(z)); g.lineTo(X(x) + 3, Z(z) - 4.5); g.lineTo(X(x) + 3, Z(z) + 4.5); g.fill();
    }
    // barrikader och tråd
    for (const key of Object.keys(sim.obstacles)) {
      const o = sim.obstacles[key], c = sim.route.cellCenter(Number(key)), kind = OBSTACLES[o.type]?.kind;
      g.fillStyle = kind === 'block' ? C.block : C.wire;
      const s = kind === 'block' ? 2.4 : 1.6;
      g.fillRect(X(c.x) - s / 2, Z(c.z) - s / 2, s, s);
    }
    // basen
    g.strokeStyle = C.base; g.lineWidth = 1.5; g.strokeRect(X(base.x) - 4, Z(base.z) - 4, 8, 8);
    g.beginPath(); g.moveTo(X(base.x) - 4, Z(base.z)); g.lineTo(X(base.x) + 4, Z(base.z)); g.stroke();
    // horden: svansar som bleknar, sedan prickarna
    const alive = new Set();
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = sim.route.place(z);
      alive.add(z.id);
      let t = trails.get(z.id);
      if (!t) trails.set(z.id, t = []);
      t.push([p.x, p.z]); if (t.length > TRAIL) t.shift();
    }
    for (const id of [...trails.keys()]) if (!alive.has(id)) trails.delete(id);
    g.fillStyle = C.horde;
    for (const t of trails.values()) for (let i = 0; i < t.length - 1; i++) {
      g.globalAlpha = 0.12 + 0.35 * i / TRAIL;
      g.fillRect(X(t[i][0]) - 0.6, Z(t[i][1]) - 0.6, 1.2, 1.2);
    }
    g.globalAlpha = 1;
    for (const t of trails.values()) { const [x, z] = t[t.length - 1]; g.fillRect(X(x) - 1.1, Z(z) - 1.1, 2.2, 2.2); }
    // pjäserna
    for (const gun of sim.guns) unit(X(gun.x), Z(gun.z), gun.weapon.type, !!gun.move);
    // pingar: förvarnade hus som inte slagits upp, och larmen (hus som slogs upp, barrikad som går sönder)
    for (const d of sim.dayCfg.dormant ?? []) {
      if (d.intel === false || sim.burst.includes(d.house)) continue;
      const h = sim.map.lots?.plots.find(p => p.id === d.house)?.house;
      if (h) ping(X(h.x), Z(h.z), clock + 0.3);
    }
    for (const a of alerts) ping(X(a.x), Z(a.z), clock, a.kind === 'barricade' ? C.block : C.ping);
    // kamerans ruta
    if (view) {
      g.strokeStyle = C.view; g.lineWidth = 1; g.beginPath();
      view.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.closePath(); g.stroke();
    }
  }

  // Klick och drag flyttar kameran dit.
  let dragging = false;
  const pan = e => { const r = cv.getBoundingClientRect(); const w = toWorld(e.clientX - r.left, e.clientY - r.top); onPan?.(w.x, w.z); };
  cv.addEventListener('pointerdown', e => { if (!bounds) return; e.preventDefault(); e.stopPropagation(); dragging = true; cv.setPointerCapture(e.pointerId); pan(e); });
  cv.addEventListener('pointermove', e => { if (dragging) pan(e); });
  cv.addEventListener('pointerup', e => { dragging = false; cv.releasePointerCapture?.(e.pointerId); });

  return {
    el,
    get visible() { return on; },
    toggle(v = !on) { on = v; el.classList.toggle('off', !on); },
    // dt: sekunder sedan förra bildrutan. Ritar om ungefär HZ gånger i sekunden.
    update(dt, state) {
      clock += dt;
      if (!on || !state?.sim) return;
      if (state.sim.map !== mapRef) setMap(state.sim.map, state.sim);
      acc += dt;
      if (acc < 1 / HZ && !state.force) return;
      acc = 0;
      draw(state);
    },
    toWorld: (px, py) => toWorld(px, py),
  };
}

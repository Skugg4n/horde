// Klick och pekare mot scenen. getTargets() anropas vid varje händelse och returnerar
// [{kind, id, object}]; träffen letar uppåt bland föräldrarna efter userData.pick.
// Träffas inget föremål räknas punkten på marken om: groundPick(x, z) får säga vad som
// ligger där (rutorna på vägen), så att hela vägytan svarar och inte bara ritade streck.
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// camera: kameran eller en funktion som ger den (kameran byts när banan byts).
// opts.ignoreClick(): true när släppet avslutade en panorering och inte ska räknas som klick.
export function createPicker(camera, dom, getTargets, groundPick = () => null, opts = {}) {
  const cam = typeof camera === 'function' ? camera : () => camera;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onGround = new THREE.Vector3();
  const pickCbs = [], hoverCbs = [];
  let hoverKey = null, moveEv = null, queued = false;

  function hitAt(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam());
    const objects = getTargets().map(t => t.object).filter(Boolean);
    for (const h of ray.intersectObjects(objects, true)) {
      for (let o = h.object; o; o = o.parent) {
        const p = o.userData && o.userData.pick;
        if (p) return { kind: p.kind, id: p.kind === 'cell' ? p.index : p.id };
      }
    }
    return ray.ray.intersectPlane(GROUND, onGround) ? groundPick(onGround.x, onGround.z) : null;
  }
  const keyOf = p => (p ? p.kind + ':' + p.id : null);

  function hover() {
    queued = false;
    const ev = moveEv; if (!ev) return;
    const p = hitAt(ev.clientX, ev.clientY);
    dom.style.cursor = p ? 'pointer' : '';
    const k = keyOf(p);
    if (k !== hoverKey) { hoverKey = k; for (const cb of hoverCbs) cb(p); }
  }
  dom.addEventListener('pointermove', ev => {
    moveEv = ev;
    if (!queued) { queued = true; requestAnimationFrame(hover); }
  });
  dom.addEventListener('pointerleave', () => {
    moveEv = null; dom.style.cursor = '';
    if (hoverKey !== null) { hoverKey = null; for (const cb of hoverCbs) cb(null); }
  });
  dom.addEventListener('click', ev => {
    if (opts.ignoreClick?.()) return;
    const p = hitAt(ev.clientX, ev.clientY);
    for (const cb of pickCbs) cb(p);
  });

  return {
    onPick(cb) { pickCbs.push(cb); },
    onHover(cb) { hoverCbs.push(cb); },
  };
}

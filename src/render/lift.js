// 0.17.1 (Mölnbos bro): strålen mot en bana med höjd. Ren (ingen three.js), så att den går att pröva i node.
// Första punkten längs strålen som ligger på eller under banans höjd heightAt(x, z) (högst TOP meter), i steg
// om STEP meter. null om strålen inte går nedåt.
const TOP = 8, STEP = 0.2;
export function liftedHit(r, heightAt) {
  const o = r.origin, d = r.direction;
  if (d.y >= -1e-6) return null;
  const t0 = Math.max(0, (TOP - o.y) / d.y), t1 = (0 - o.y) / d.y;
  for (let t = t0; t <= t1 + 1e-9; t += STEP) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y <= heightAt(x, z) + 0.02) return { x, z };
  }
  return { x: o.x + d.x * t1, z: o.z + d.z * t1 };
}

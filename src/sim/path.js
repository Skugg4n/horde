export function pathLength(path) {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return L;
}
export function pointAt(path, d) {
  let rest = Math.max(0, d);
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const seg = Math.hypot(bx - ax, bz - az);
    const dirX = (bx - ax) / seg, dirZ = (bz - az) / seg;
    if (rest <= seg || i === path.length - 1) {
      const k = Math.min(rest, seg);
      return { x: ax + dirX * k, z: az + dirZ * k, dirX, dirZ };
    }
    rest -= seg;
  }
}

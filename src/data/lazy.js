// Ett fält som räknas först när någon läser det (0.20.0, H502, laddtiden): banornas rutnät och placering räknades
// för alla fyra banorna vid varje start, fast bara den som laddas behövs. Läses det, räknas det en gång och står
// sedan kvar som ett vanligt fält (samma värde som förut, bara senare). Går att skriva över som ett vanligt fält.
export function lazy(obj, key, make) {
  const settle = v => Object.defineProperty(obj, key, { value: v, writable: true, configurable: true, enumerable: true });
  Object.defineProperty(obj, key, { configurable: true, enumerable: true, get() { const v = make(); settle(v); return v; }, set(v) { settle(v); } });
  return obj;
}

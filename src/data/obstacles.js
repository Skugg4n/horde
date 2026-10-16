export const OBSTACLES = {
  wire:  { id: 'wire', name: 'Barbed wire', short: 'Wire', desc: 'Slows them down. Wears out.', cost: 80, kind: 'slow', slow: 0.4, durability: 60 },
  block: { id: 'block', name: 'Concrete barrier', short: 'Barrier', desc: 'Stops them until they break it.', cost: 150, kind: 'block', hp: 400 },
  // 0.14.0: skrotbilar som knuffas tvärs över gatan. Billigare och svagare än betongen, finns överallt.
  car: { id: 'car', name: 'Junk cars', short: 'Junk cars', desc: 'Wrecks pushed across the street. Cheaper than concrete, they give way sooner.', cost: 90, kind: 'block', hp: 240 },
};

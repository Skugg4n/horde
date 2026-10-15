export const RESEARCH = [
  { id: 'm2', name: 'M2 .50 cal', desc: 'New gun: heavy machine gun.', cost: 100, requires: [] },
  { id: 'm249Rate', name: 'Faster M249', desc: 'M249 fires 25 % faster.', cost: 40, requires: [] },
  { id: 'wireTough', name: 'Heavy wire', desc: 'Barbed wire lasts twice as long.', cost: 50, requires: [] },
  { id: 'block', name: 'Concrete barrier', desc: 'New obstacle that stops the horde.', cost: 60, requires: ['wireTough'] },
  { id: 'budget', name: 'Bigger budget', desc: '$ 150 more cash every day.', cost: 70, requires: [] },
  { id: 'slot4', name: 'New position', desc: 'Opens a fourth position.', cost: 80, requires: ['m2'] },
];

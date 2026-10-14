export const RESEARCH = [
  { id: 'm2', name: 'M2 .50 cal', desc: 'Ny pjäs: tung kulspruta.', cost: 15, requires: [] },
  { id: 'm249Rate', name: 'Snabbare M249', desc: 'M249 skjuter 25 % snabbare.', cost: 10, requires: [] },
  { id: 'wireTough', name: 'Grövre taggtråd', desc: 'Taggtråd håller dubbelt så länge.', cost: 12, requires: [] },
  { id: 'block', name: 'Betongblock', desc: 'Nytt hinder som stoppar horden.', cost: 20, requires: ['wireTough'] },
  { id: 'budget', name: 'Större budget', desc: '150 mer pengar varje dag.', cost: 20, requires: [] },
  { id: 'slot4', name: 'Ny position', desc: 'Öppnar en fjärde position.', cost: 25, requires: ['m2'] },
];

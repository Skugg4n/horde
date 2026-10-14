export const RESEARCH = [
  { id: 'm2', name: 'M2 .50 cal', desc: 'Ny pjäs: tung kulspruta.', cost: 100, requires: [] },
  { id: 'm249Rate', name: 'Snabbare M249', desc: 'M249 skjuter 25 % snabbare.', cost: 40, requires: [] },
  { id: 'wireTough', name: 'Grövre taggtråd', desc: 'Taggtråd håller dubbelt så länge.', cost: 50, requires: [] },
  { id: 'block', name: 'Betongblock', desc: 'Nytt hinder som stoppar horden.', cost: 60, requires: ['wireTough'] },
  { id: 'budget', name: 'Större budget', desc: '150 mer pengar varje dag.', cost: 70, requires: [] },
  { id: 'slot4', name: 'Ny position', desc: 'Öppnar en fjärde position.', cost: 80, requires: ['m2'] },
];

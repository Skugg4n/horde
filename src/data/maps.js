// Banor som data. Task 2 lägger till fler fält.
export const MAPS = {
  riksvagen: {
    id: 'riksvagen',
    name: 'Riksvägen',
    camera: { target: [-2, 0], view: 25 },
    path: [[46, 0], [-12, 0]],
    props: [
      { kind: 'car', x: 12, z: 7.5, ry: 0.5, color: '#6b2f22' },
      { kind: 'car', x: 26, z: -8, ry: -0.3, color: '#3a3a33', burnt: true },
      { kind: 'car', x: -6, z: -10, ry: 1.3, color: '#56605a' },
      { kind: 'car', x: 38, z: 6.5, ry: 2.6, color: '#7b6a45' },
      { kind: 'jersey', x: -10, z: 7, ry: 0.1 },
      { kind: 'jersey', x: -10.6, z: 10.2, ry: 0.25 },
      { kind: 'jersey', x: -19, z: -6.5, ry: 1.5 },
      { kind: 'barrel', x: -12.5, z: 4.5, color: '#4d5a3d' },
      { kind: 'barrel', x: -13.3, z: 5.2, color: '#7a3b22' },
      { kind: 'barrel', x: 16, z: -6.2, color: '#4d5a3d', tipped: true },
      { kind: 'barrel', x: -17.5, z: 5.5, color: '#2f3a40' },
      { kind: 'tree', x: 4, z: -11, h: 5 },
      { kind: 'tree', x: 20, z: 12, h: 6 },
      { kind: 'tree', x: -24, z: 12, h: 4.5 },
      { kind: 'tree', x: 44, z: -12, h: 5.5 },
      { kind: 'poles', x0: -40, x1: 60, step: 16, z: -6.8 },
      { kind: 'ruin', x: -26, z: -15, ry: 0.2 },
    ],
  },
};

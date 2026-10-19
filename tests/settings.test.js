import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, normalizeSettings, effectiveVolume, DEFAULT_SETTINGS } from '../src/meta/settings.js';

const fake = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
};

test('utan sparade inställningar gäller standardvärdena', () => {
  assert.deepEqual(loadSettings(fake()), { ...DEFAULT_SETTINGS });
});

test('sparade inställningar läses tillbaka, under nyckeln horde.settings', () => {
  const s = fake();
  assert.equal(saveSettings({ sound: 0.3, music: 0, soundMuted: true, musicMuted: false }, s), true);
  assert.ok(s.m.has('horde.settings'));
  assert.deepEqual(loadSettings(s), { sound: 0.3, music: 0, soundMuted: true, musicMuted: false, speed: 1, shriek: 'classic', hub: 'table' });
});

test('trasig eller konstig data ger standardvärden och nivåerna hålls mellan 0 och 1', () => {
  assert.deepEqual(loadSettings(fake({ 'horde.settings': '{trasigt' })), { ...DEFAULT_SETTINGS });
  assert.deepEqual(loadSettings(fake({ 'horde.settings': '[1,2]' })), { ...DEFAULT_SETTINGS });
  const n = normalizeSettings({ sound: 7, music: -2, soundMuted: 'ja' });
  assert.equal(n.sound, 1); assert.equal(n.music, 0); assert.equal(n.soundMuted, false);
  assert.equal(normalizeSettings({ sound: NaN }).sound, DEFAULT_SETTINGS.sound);
});

test('lagring som kastar fel kraschar inte, och sparandet säger false', () => {
  const bad = { getItem() { throw new Error('nekad'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(loadSettings(bad), { ...DEFAULT_SETTINGS });
  assert.equal(saveSettings(DEFAULT_SETTINGS, bad), false);
});

test('inställningarna rör inte sparfilen', () => {
  const s = fake({ 'horde.save': 'x' });
  saveSettings(DEFAULT_SETTINGS, s);
  assert.equal(s.m.get('horde.save'), 'x');
});

test('avstängd kanal ger volym 0', () => {
  const st = { sound: 0.5, music: 0.7, soundMuted: true, musicMuted: false };
  assert.equal(effectiveVolume(st, 'sound'), 0);
  assert.equal(effectiveVolume(st, 'music'), 0.7);
});

test('farten sparas och läses tillbaka; okänd fart ger 1x', () => {
  const s = fake();
  saveSettings({ ...DEFAULT_SETTINGS, speed: 3 }, s);
  assert.equal(loadSettings(s).speed, 3);
  assert.equal(normalizeSettings({ speed: 7 }).speed, 1);
  assert.equal(normalizeSettings({ speed: '2' }).speed, 1);
});

test('springarens skrik: classic som standard, torn går att välja, okänt blir classic', () => {
  assert.equal(DEFAULT_SETTINGS.shriek, 'classic');
  const s = fake();
  saveSettings({ ...DEFAULT_SETTINGS, shriek: 'torn' }, s);
  assert.equal(loadSettings(s).shriek, 'torn');
  assert.equal(normalizeSettings({ shriek: 'gurgle' }).shriek, 'classic');
  assert.equal(normalizeSettings({}).shriek, 'classic');
});

test('mellan dagarna: kartbordet som standard, de gamla skyltarna går att välja, okänt blir bordet (0.21.0)', () => {
  assert.equal(DEFAULT_SETTINGS.hub, 'table');
  const s = fake();
  saveSettings({ ...DEFAULT_SETTINGS, hub: 'classic' }, s);
  assert.equal(loadSettings(s).hub, 'classic');
  assert.equal(normalizeSettings({ hub: 'wall' }).hub, 'table');
});

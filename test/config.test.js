import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  mergeSettings,
  resolvePath,
  readCredentials
} from '../src/config.js';

async function withTmpDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-config-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('loadSettings returns the defaults when no settings.json exists', async () => {
  await withTmpDir(async (dir) => {
    const settings = await loadSettings({ cwd: dir });
    assert.equal(settings.recursive, true);
    assert.deepEqual(settings.extensions, ['mp4', 'mkv', 'avi']);
    assert.deepEqual(settings.langs, ['all']);
    assert.equal(settings.provider, 'opensubtitles');
  });
});

test('loadSettings merges a stored file over the defaults (arrays replace)', async () => {
  await withTmpDir(async (dir) => {
    await writeFile(
      join(dir, 'settings.json'),
      JSON.stringify({ langs: ['en', 'it'], useSubs: true })
    );
    const settings = await loadSettings({ cwd: dir });
    assert.deepEqual(settings.langs, ['en', 'it']);
    assert.equal(settings.useSubs, true);
    assert.equal(settings.recursive, true); // untouched default
  });
});

test('loadSettings tolerates a malformed settings.json', async () => {
  await withTmpDir(async (dir) => {
    await writeFile(join(dir, 'settings.json'), '{ not json');
    const warnings = [];
    const original = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
      const settings = await loadSettings({ cwd: dir });
      assert.deepEqual(settings.langs, ['all']);
    } finally {
      console.warn = original;
    }
    assert.equal(warnings.length, 1);
  });
});

test('mergeSettings does not mutate the frozen defaults', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, { langs: ['fr'] });
  merged.langs.push('de');
  assert.deepEqual(DEFAULT_SETTINGS.langs, ['all']);
});

test('resolvePath expands the CWD sentinel and trims a trailing slash', () => {
  assert.equal(resolvePath({ path: 'CWD' }, '/home/x'), '/home/x');
  assert.equal(resolvePath({ path: '/movies/' }), '/movies');
});

test('saveSettings persists a copy, drops transient keys and re-folds the cwd path', async () => {
  await withTmpDir(async (dir) => {
    await saveSettings(
      { ...DEFAULT_SETTINGS, path: dir, langs: ['en'], save: true, onlySettings: true },
      { cwd: dir }
    );
    const stored = JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8'));
    assert.equal(stored.path, 'CWD');
    assert.deepEqual(stored.langs, ['en']);
    assert.ok(!('save' in stored));
    assert.ok(!('onlySettings' in stored));
  });
});

test('readCredentials pulls from the environment only', () => {
  const creds = readCredentials({
    OPENSUBTITLES_API_KEY: 'k',
    OPENSUBTITLES_USERNAME: 'u',
    OPENSUBTITLES_PASSWORD: 'p'
  });
  assert.deepEqual(creds, { apiKey: 'k', username: 'u', password: 'p' });
  assert.deepEqual(readCredentials({}), { apiKey: '', username: '', password: '' });
});

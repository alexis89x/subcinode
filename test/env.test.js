import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvFile } from '../src/env.js';

async function withEnv(contents, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-env-'));
  const file = join(dir, '.env');
  await writeFile(file, contents);
  const snapshot = { ...process.env };
  try {
    return await fn(file);
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }
    await rm(dir, { recursive: true, force: true });
  }
}

test('returns false when the file does not exist', () => {
  assert.equal(loadEnvFile(join(tmpdir(), 'subcinode-nope-xyz', '.env')), false);
});

test('parses KEY=VALUE, skips comments and blank lines, strips quotes', async () => {
  await withEnv(
    ['# a comment', '', 'OPENSUBTITLES_API_KEY=abc123', 'FOO="quoted value"', "BAR='x'"].join('\n'),
    (file) => {
      assert.equal(loadEnvFile(file), true);
      assert.equal(process.env.OPENSUBTITLES_API_KEY, 'abc123');
      assert.equal(process.env.FOO, 'quoted value');
      assert.equal(process.env.BAR, 'x');
    }
  );
});

test('does not overwrite a variable that is already set', async () => {
  await withEnv('PRESET=from_file', (file) => {
    process.env.PRESET = 'from_shell';
    loadEnvFile(file);
    assert.equal(process.env.PRESET, 'from_shell');
  });
});

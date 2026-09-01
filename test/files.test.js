import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { walk, saveAs, shouldDownload, normalizeLang } from '../src/files.js';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-files-'));
  await writeFile(join(dir, 'movie.mkv'), 'x');
  await writeFile(join(dir, 'notes.txt'), 'x');
  await writeFile(join(dir, 'done.mkv'), 'x');
  await writeFile(join(dir, 'done.en.srt'), 'x'); // already downloaded
  await mkdir(join(dir, 'season1'));
  await writeFile(join(dir, 'season1', 'episode.avi'), 'x');
  await mkdir(join(dir, 'subs'));
  await writeFile(join(dir, 'subs', 'stray.mkv'), 'x'); // must be ignored
  return dir;
}

test('saveAs builds Name.lang.srt keeping earlier dots', () => {
  assert.equal(saveAs('Movie.2015.mkv', 'en'), 'Movie.2015.en.srt');
  assert.equal(saveAs('noext', 'it'), 'noext.it.srt');
});

test('normalizeLang maps 3-letter to 2-letter and passes through the rest', () => {
  assert.equal(normalizeLang('eng'), 'en');
  assert.equal(normalizeLang('EN'), 'en');
  assert.equal(normalizeLang('all'), 'all');
  assert.equal(normalizeLang('zz'), 'zz');
});

test('shouldDownload skips only when every requested language is already present', () => {
  assert.equal(shouldDownload('/nope', 'x.mkv', ['en']), true);
});

test('walk (recursive) collects wanted extensions, skips others and the subs/ folder', async () => {
  const dir = await fixture();
  try {
    const found = walk(dir, { extensions: ['mkv', 'avi'], langs: ['it'], recursive: true })
      .map((f) => f.fileName)
      .sort();
    assert.deepEqual(found, ['episode.avi', 'done.mkv', 'movie.mkv'].sort());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('walk honours the "already downloaded" skip', async () => {
  const dir = await fixture();
  try {
    const found = walk(dir, { extensions: ['mkv'], langs: ['en'], recursive: false }).map(
      (f) => f.fileName
    );
    assert.deepEqual(found.sort(), ['movie.mkv']); // done.mkv already has done.en.srt
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('walk (non-recursive) stays in the top directory', async () => {
  const dir = await fixture();
  try {
    const found = walk(dir, { extensions: ['avi'], recursive: false });
    assert.equal(found.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('walk returns [] for a missing directory', () => {
  assert.deepEqual(walk('/definitely/not/here', { extensions: ['mkv'] }), []);
});

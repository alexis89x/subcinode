import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { get as httpGet } from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringifySync } from 'subtitle';
import { run } from '../src/run.js';
import { registerProvider } from '../src/providers/index.js';
import { PROMO_TEXT } from '../src/promo.js';

const SRT = stringifySync(
  [
    { type: 'cue', data: { start: 0, end: 1000, text: 'One' } },
    { type: 'cue', data: { start: 1200, end: 2200, text: 'Two' } },
    { type: 'cue', data: { start: 2400, end: 3400, text: 'Three' } },
    { type: 'cue', data: { start: 3600, end: 4600, text: 'Four' } },
    { type: 'cue', data: { start: 4800, end: 5800, text: 'Five' } },
    { type: 'cue', data: { start: 6000, end: 7000, text: 'Six' } },
    { type: 'cue', data: { start: 20000, end: 21000, text: 'Seven' } },
    { type: 'cue', data: { start: 21200, end: 22200, text: 'Eight' } }
  ],
  { format: 'srt' }
);

let base;
let server;

test.before(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(SRT);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  registerProvider(
    'mock',
    class {
      get name() {
        return 'mock';
      }
      async init() {}
      async search() {
        return [{ langId: 'en', fileId: 1, fileName: 'm.srt', downloadCount: 1 }];
      }
      async resolveDownloadUrl() {
        return { url: `${base}/sub`, fileName: 'm.srt' };
      }
    }
  );
});

test.after(() => server.close());

async function withFixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-run-'));
  await writeFile(join(dir, 'Movie.2015.mkv'), Buffer.alloc(4096, 7));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const opts = (dir, extra = {}) => ({
  cli: { provider: 'mock', langs: ['en'], path: dir, ...extra }
});
const deps = (dir) => ({ cwd: dir, env: {}, noDelay: true, version: 'test', downloadDeps: { httpGet } });

test('run downloads a subtitle next to the video and inserts the promo caption', async () => {
  await withFixture(async (dir) => {
    const result = await run(opts(dir), deps(dir));

    assert.equal(result.errors.length, 0);
    assert.equal(result.downloaded.length, 1);

    const target = join(dir, 'Movie.2015.en.srt');
    assert.ok(existsSync(target));
    assert.ok((await readFile(target, 'utf8')).includes(PROMO_TEXT));
  });
});

test('run skips a language whose subtitle file already exists', async () => {
  await withFixture(async (dir) => {
    await writeFile(join(dir, 'Movie.2015.en.srt'), 'already here');
    const result = await run(opts(dir), deps(dir));
    assert.equal(result.downloaded.length, 0);
    assert.equal(await readFile(join(dir, 'Movie.2015.en.srt'), 'utf8'), 'already here');
  });
});

test('run honours useSubs by writing under a subs/ folder', async () => {
  await withFixture(async (dir) => {
    const result = await run(opts(dir, { useSubs: true }), deps(dir));
    assert.equal(result.downloaded.length, 1);
    assert.ok(existsSync(join(dir, 'subs', 'Movie.2015.en.srt')));
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { get as httpGet } from 'node:http';
import { gzipSync } from 'node:zlib';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadFile } from '../src/download.js';

const BODY = 'WEBVTT\n\n' + '1\n00:00:01,000 --> 00:00:02,000\nHello world\n\n'.repeat(500);

function startServer() {
  const server = createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(BODY);
    } else if (req.url === '/gz') {
      res.writeHead(200, { 'content-encoding': 'gzip' });
      res.end(gzipSync(Buffer.from(BODY)));
    } else if (req.url === '/redirect') {
      res.writeHead(302, { location: '/ok' });
      res.end();
    } else {
      res.writeHead(404);
      res.end('nope');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function withCtx(fn) {
  const { server, base } = await startServer();
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-dl-'));
  try {
    return await fn({ base, dir });
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
}

const deps = { httpGet };

test('downloads the full body and resolves after the stream finishes', async () => {
  await withCtx(async ({ base, dir }) => {
    const target = join(dir, 'nested', 'movie.en.srt');
    await downloadFile(`${base}/ok`, target, deps);
    assert.equal(await readFile(target, 'utf8'), BODY);
  });
});

test('inflates a gzip-encoded response', async () => {
  await withCtx(async ({ base, dir }) => {
    const target = join(dir, 'movie.en.srt');
    await downloadFile(`${base}/gz`, target, deps);
    assert.equal(await readFile(target, 'utf8'), BODY);
  });
});

test('follows a redirect', async () => {
  await withCtx(async ({ base, dir }) => {
    const target = join(dir, 'movie.en.srt');
    await downloadFile(`${base}/redirect`, target, deps);
    assert.equal(await readFile(target, 'utf8'), BODY);
  });
});

test('rejects on a non-200 response', async () => {
  await withCtx(async ({ base, dir }) => {
    await assert.rejects(
      () => downloadFile(`${base}/missing`, join(dir, 'x.srt'), deps),
      /HTTP 404/
    );
  });
});

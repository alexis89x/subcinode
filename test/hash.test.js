import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeHash } from '../src/hash.js';

async function withTmpDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'subcinode-hash-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('hashes a small file from first principles (chunks overlap the whole file)', async () => {
  await withTmpDir(async (dir) => {
    const file = join(dir, 'tiny.bin');
    const bytes = Buffer.from(Array.from({ length: 16 }, (_, i) => i)); // 00..0f
    await writeFile(file, bytes);

    const word0 = 0x0706050403020100n;
    const word1 = 0x0f0e0d0c0b0a0908n;
    // size + checksum(head) + checksum(tail); head and tail both span the whole 16-byte file
    const expected = ((16n + 2n * (word0 + word1)) & ((1n << 64n) - 1n))
      .toString(16)
      .padStart(16, '0');

    const { moviehash, moviebytesize } = await computeHash(file);
    assert.equal(moviehash, expected);
    assert.equal(moviebytesize, 16);
  });
});

test('ignores trailing bytes that do not fill a 64-bit word', async () => {
  await withTmpDir(async (dir) => {
    const file = join(dir, 'five.bin');
    await writeFile(file, Buffer.from([1, 2, 3, 4, 5]));
    const { moviehash, moviebytesize } = await computeHash(file);
    // wordLen is 0, so only the file size contributes
    assert.equal(moviehash, '0000000000000005');
    assert.equal(moviebytesize, 5);
  });
});

test('produces a 16-char lowercase hex string for a large file', async () => {
  await withTmpDir(async (dir) => {
    const file = join(dir, 'big.bin');
    await writeFile(file, Buffer.alloc(200 * 1024, 0xab));
    const { moviehash } = await computeHash(file);
    assert.match(moviehash, /^[0-9a-f]{16}$/);
  });
});

test('rejects an empty file', async () => {
  await withTmpDir(async (dir) => {
    const file = join(dir, 'empty.bin');
    await writeFile(file, Buffer.alloc(0));
    await assert.rejects(() => computeHash(file), /empty file/i);
  });
});

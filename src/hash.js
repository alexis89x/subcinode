import { open, stat } from 'node:fs/promises';

const CHUNK_SIZE = 64 * 1024; // 64 KiB
const U64_MASK = (1n << 64n) - 1n;

/**
 * Sums every little-endian unsigned 64-bit word in `buffer`, wrapping at 2^64.
 * @param {Buffer} buffer length must be a multiple of 8
 * @returns {bigint}
 */
function sumWords(buffer) {
  let sum = 0n;
  for (let offset = 0; offset + 8 <= buffer.length; offset += 8) {
    sum = (sum + buffer.readBigUInt64LE(offset)) & U64_MASK;
  }
  return sum;
}

/**
 * Computes the OpenSubtitles / OSDb movie hash: `filesize + checksum(first 64 KiB) +
 * checksum(last 64 KiB)`, where a checksum is the wrapping sum of the chunk's 64-bit
 * little-endian words. Returned as a 16-char zero-padded lowercase hex string.
 *
 * Files smaller than one chunk are read whole (the two chunks overlap entirely).
 *
 * @param {string} filePath
 * @param {{ open?: typeof open, stat?: typeof stat }} [deps] injectable fs for tests
 * @returns {Promise<{ moviehash: string, moviebytesize: number }>}
 */
export async function computeHash(filePath, deps = {}) {
  const fsOpen = deps.open || open;
  const fsStat = deps.stat || stat;

  const { size } = await fsStat(filePath);
  if (size === 0) {
    throw new Error(`Cannot hash empty file: ${filePath}`);
  }

  const handle = await fsOpen(filePath, 'r');
  try {
    const readLen = Math.min(CHUNK_SIZE, size);
    // Round down to a multiple of 8 so trailing bytes (which the algorithm ignores) are dropped.
    const wordLen = readLen - (readLen % 8);

    const head = Buffer.alloc(readLen);
    await handle.read(head, 0, readLen, 0);

    const tail = Buffer.alloc(readLen);
    await handle.read(tail, 0, readLen, Math.max(0, size - readLen));

    let hash =
      (BigInt(size) + sumWords(head.subarray(0, wordLen)) + sumWords(tail.subarray(0, wordLen))) &
      U64_MASK;

    return {
      moviehash: hash.toString(16).padStart(16, '0'),
      moviebytesize: size
    };
  } finally {
    await handle.close();
  }
}

export default computeHash;

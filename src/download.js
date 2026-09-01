import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { get as httpsGet } from 'node:https';
import { get as httpGet } from 'node:http';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const MAX_REDIRECTS = 5;

/**
 * Resolves with the 200 `IncomingMessage` for `url`, following up to `redirectsLeft`
 * redirects. Rejects on transport errors, unsupported protocols and non-200 responses.
 */
function fetchStream(url, requesters, redirectsLeft) {
  return new Promise((resolveStream, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid download URL: ${url}`));
      return;
    }

    const getFn = requesters[parsed.protocol];
    if (!getFn) {
      reject(new Error(`Unsupported protocol: ${parsed.protocol}`));
      return;
    }

    const req = getFn(url, (res) => {
      const { statusCode, headers } = res;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume(); // drain
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        const next = new URL(headers.location, url).toString();
        resolveStream(fetchStream(next, requesters, redirectsLeft - 1));
        return;
      }

      if (statusCode !== 200) {
        res.resume();
        reject(new Error(`Download failed: HTTP ${statusCode} for ${url}`));
        return;
      }

      resolveStream(res);
    });

    req.on('error', reject);
  });
}

/**
 * Downloads `url` into `destPath`, creating parent directories, inflating gzip, and
 * resolving only once the file has been fully written and flushed. A partial file is
 * removed on failure.
 *
 * @param {string} url
 * @param {string} destPath
 * @param {{ httpGet?: Function, httpsGet?: Function, mkdir?: Function }} [deps]
 * @returns {Promise<string>} the written path
 */
export async function downloadFile(url, destPath, deps = {}) {
  const requesters = {
    'https:': deps.httpsGet || httpsGet,
    'http:': deps.httpGet || httpGet
  };
  const makeDir = deps.mkdir || mkdir;

  await makeDir(dirname(destPath), { recursive: true });

  const response = await fetchStream(url, requesters, MAX_REDIRECTS);

  const encoding = String(response.headers['content-encoding'] || '').toLowerCase();
  const gzipped = encoding === 'gzip' || url.split('?')[0].toLowerCase().endsWith('.gz');

  // pipeline() propagates errors from every stage and cleans up the rest.
  const stages = gzipped
    ? [response, createGunzip(), createWriteStream(destPath)]
    : [response, createWriteStream(destPath)];

  try {
    await pipeline(...stages);
  } catch (err) {
    await unlink(destPath).catch(() => {});
    throw err;
  }

  return destPath;
}

export default downloadFile;

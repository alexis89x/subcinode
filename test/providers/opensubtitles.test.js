import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenSubtitlesProvider, normalizeLanguages } from '../../src/providers/opensubtitles.js';
import { getProvider, availableProviders } from '../../src/providers/index.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, statusText: '', text: async () => JSON.stringify(body) };
}

/** Records every fetch call and replies from a queue of responders. */
function fakeFetch(responders) {
  const calls = [];
  const queue = [...responders];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const next = queue.shift();
    return typeof next === 'function' ? next(url, init) : next;
  };
  fetch.calls = calls;
  return fetch;
}

test('normalizeLanguages sorts, de-dupes and drops "all"', () => {
  assert.equal(normalizeLanguages(['ita', 'eng', 'en']), 'en,it');
  assert.equal(normalizeLanguages('eng,ita'), 'en,it');
  assert.equal(normalizeLanguages(['all']), null);
  assert.equal(normalizeLanguages([]), null);
  assert.equal(normalizeLanguages(undefined), null);
});

test('getProvider returns the OpenSubtitles implementation by default', () => {
  assert.ok(getProvider('opensubtitles', { apiKey: 'k' }) instanceof OpenSubtitlesProvider);
  assert.ok(availableProviders().includes('opensubtitles'));
  assert.throws(() => getProvider('nope'), /Unknown subtitle provider/);
});

test('init rejects without an API key', async () => {
  const provider = new OpenSubtitlesProvider({}, { fetch: fakeFetch([]) });
  await assert.rejects(() => provider.init(), /Missing OpenSubtitles API key/);
});

test('init logs in when credentials are supplied and caches the bearer token', async () => {
  const fetch = fakeFetch([jsonResponse({ token: 'jwt-123' })]);
  const provider = new OpenSubtitlesProvider(
    { apiKey: 'k', username: 'u', password: 'p' },
    { fetch }
  );
  await provider.init();

  const [{ url, init }] = fetch.calls;
  assert.equal(url, 'https://api.opensubtitles.com/api/v1/login');
  assert.equal(init.method, 'POST');
  assert.deepEqual(JSON.parse(init.body), { username: 'u', password: 'p' });
  assert.equal(init.headers['Api-Key'], 'k');
  assert.match(init.headers['User-Agent'], /subcinode/);
  assert.equal(provider.token, 'jwt-123');
});

test('search builds the query and maps results sorted by download count', async () => {
  const fetch = fakeFetch([
    jsonResponse({
      data: [
        {
          id: '1',
          attributes: {
            language: 'en',
            download_count: 10,
            files: [{ file_id: 111, file_name: 'a.srt' }]
          }
        },
        {
          id: '2',
          attributes: {
            language: 'it',
            download_count: 99,
            files: [{ file_id: 222, file_name: 'b.srt' }]
          }
        },
        { id: '3', attributes: { language: 'de', download_count: 5, files: [] } }
      ]
    })
  ]);
  const provider = new OpenSubtitlesProvider({ apiKey: 'k' }, { fetch });

  const results = await provider.search(
    { moviehash: 'abc123', moviebytesize: 456 },
    { languages: ['eng', 'ita'] }
  );

  const [{ url }] = fetch.calls;
  assert.ok(url.startsWith('https://api.opensubtitles.com/api/v1/subtitles?'));
  assert.ok(url.includes('moviehash=abc123'));
  assert.ok(url.includes('moviebytesize=456'));
  assert.ok(url.includes('languages=en%2Cit'));

  assert.deepEqual(
    results.map((r) => r.fileId),
    [222, 111]
  );
  assert.equal(results[0].langId, 'it');
});

test('resolveDownloadUrl posts the file id and returns the link', async () => {
  const fetch = fakeFetch([jsonResponse({ link: 'https://dl.example/x.srt', file_name: 'x.srt' })]);
  const provider = new OpenSubtitlesProvider({ apiKey: 'k' }, { fetch });
  provider.token = 'jwt';

  const out = await provider.resolveDownloadUrl({ fileId: 222, fileName: 'fallback.srt' });

  const [{ url, init }] = fetch.calls;
  assert.equal(url, 'https://api.opensubtitles.com/api/v1/download');
  assert.equal(init.method, 'POST');
  assert.deepEqual(JSON.parse(init.body), { file_id: 222 });
  assert.equal(init.headers.Authorization, 'Bearer jwt');
  assert.deepEqual(out, { url: 'https://dl.example/x.srt', fileName: 'x.srt' });
});

test('a non-200 response is turned into an error with the API message', async () => {
  const fetch = fakeFetch([jsonResponse({ message: 'invalid api key' }, { ok: false, status: 403 })]);
  const provider = new OpenSubtitlesProvider({ apiKey: 'bad' }, { fetch });
  await assert.rejects(
    () => provider.search({ moviehash: 'abc' }),
    /OpenSubtitles GET \/subtitles failed: invalid api key/
  );
});

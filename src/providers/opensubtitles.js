import { normalizeLang } from '../files.js';

const DEFAULT_BASE_URL = 'https://api.opensubtitles.com/api/v1';
const CONSUMER_URL = 'https://www.opensubtitles.com/consumers';

/**
 * Turns a language spec (array, CSV string, or nullish) into the comma-separated,
 * de-duplicated, alphabetically sorted 2-letter list the REST API expects. Returns
 * `null` when the caller wants every language (`all` / empty), so the param is omitted.
 *
 * @param {string[]|string|undefined} languages
 * @returns {string|null}
 */
export function normalizeLanguages(languages) {
  let list = languages;
  if (typeof list === 'string') {
    list = list.split(',');
  }
  if (!Array.isArray(list) || !list.length) {
    return null;
  }
  const codes = new Set();
  for (const raw of list) {
    const code = normalizeLang(String(raw).trim());
    if (!code || code === 'all') {
      return null;
    }
    codes.add(code);
  }
  return [...codes].sort().join(',');
}

/**
 * opensubtitles.com REST API v1 implementation of the subtitle-provider interface.
 *
 * Interface:
 *  - `async init()`                       validate credentials, obtain a bearer token
 *  - `async search(fileInfo, opts)`       -> [{ langId, fileId, fileName, downloadCount }]
 *  - `async resolveDownloadUrl(result)`   -> { url, fileName }
 */
export class OpenSubtitlesProvider {
  /**
   * @param {{ apiKey?: string, username?: string, password?: string, userAgent?: string, baseUrl?: string }} config
   * @param {{ fetch?: typeof fetch }} [deps]
   */
  constructor(config = {}, deps = {}) {
    this.apiKey = config.apiKey || '';
    this.username = config.username || '';
    this.password = config.password || '';
    this.userAgent = config.userAgent || 'subcinode v2.0.0';
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetch = deps.fetch || globalThis.fetch;
    this.token = null;
  }

  get name() {
    return 'opensubtitles';
  }

  #headers(extra = {}) {
    const headers = {
      'Api-Key': this.apiKey,
      'User-Agent': this.userAgent,
      Accept: 'application/json',
      ...extra
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async #request(path, { method = 'GET', body, query } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    const init = { method, headers: this.#headers(body ? { 'Content-Type': 'application/json' } : {}) };
    if (body) {
      init.body = JSON.stringify(body);
    }

    const res = await this.fetch(url, init);
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const detail =
        json.message ||
        (Array.isArray(json.errors) && json.errors.join(', ')) ||
        res.statusText ||
        `HTTP ${res.status}`;
      const err = new Error(`OpenSubtitles ${method} ${path} failed: ${detail}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  async init() {
    if (!this.apiKey) {
      throw new Error(
        `Missing OpenSubtitles API key. Set OPENSUBTITLES_API_KEY (free key: ${CONSUMER_URL}).`
      );
    }
    if (this.username && this.password) {
      const data = await this.#request('/login', {
        method: 'POST',
        body: { username: this.username, password: this.password }
      });
      this.token = data.token || null;
    }
    return this;
  }

  /**
   * @param {{ moviehash: string, moviebytesize?: number }} fileInfo
   * @param {{ languages?: string[]|string }} [opts]
   */
  async search(fileInfo, opts = {}) {
    const query = { moviehash: fileInfo.moviehash };
    if (fileInfo.moviebytesize) {
      query.moviebytesize = String(fileInfo.moviebytesize);
    }
    const languages = normalizeLanguages(opts.languages);
    if (languages) {
      query.languages = languages;
    }

    const data = await this.#request('/subtitles', { query });
    const results = [];
    for (const item of data.data || []) {
      const attr = item.attributes || {};
      const file = (attr.files || [])[0];
      if (!file || file.file_id == null) {
        continue;
      }
      results.push({
        langId: String(attr.language || '').toLowerCase(),
        fileId: file.file_id,
        fileName: file.file_name || attr.release || `${item.id}.srt`,
        downloadCount: attr.download_count || 0
      });
    }
    results.sort((a, b) => b.downloadCount - a.downloadCount);
    return results;
  }

  /**
   * @param {{ fileId: (number|string), fileName?: string }} result
   * @returns {Promise<{ url: string, fileName: string }>}
   */
  async resolveDownloadUrl(result) {
    const data = await this.#request('/download', {
      method: 'POST',
      body: { file_id: result.fileId }
    });
    if (!data.link) {
      throw new Error(`OpenSubtitles returned no download link for file ${result.fileId}`);
    }
    return { url: data.link, fileName: data.file_name || result.fileName };
  }
}

export default OpenSubtitlesProvider;

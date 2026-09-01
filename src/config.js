import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const SETTINGS_FILE = 'settings.json';

/** Persisted, user-facing defaults. */
export const DEFAULT_SETTINGS = Object.freeze({
  provider: 'opensubtitles',
  recursive: true,
  extensions: ['mp4', 'mkv', 'avi'],
  langs: ['all'],
  path: 'CWD', // sentinel: resolved to the current working directory at runtime
  useSubs: false,
  debug: false
});

/** Keys that are computed per-run and must never be written back to settings.json. */
const TRANSIENT_KEYS = ['save', 'onlySettings', 'credentials'];

function deepClone(value) {
  return structuredClone(value);
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-merges `source` onto a clone of `base` (arrays replace, objects merge).
 */
export function mergeSettings(base, source) {
  const out = deepClone(base);
  if (!isPlainObject(source)) {
    return out;
  }
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? mergeSettings(out[key], value) : deepClone(value);
  }
  return out;
}

/**
 * Reads OpenSubtitles credentials from the environment. These are never written to disk.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 */
export function readCredentials(env = process.env) {
  return {
    apiKey: env.OPENSUBTITLES_API_KEY || '',
    username: env.OPENSUBTITLES_USERNAME || '',
    password: env.OPENSUBTITLES_PASSWORD || ''
  };
}

/**
 * Loads settings.json (if present) and merges it onto {@link DEFAULT_SETTINGS}.
 * Missing file is not an error. Does not resolve the `path` sentinel.
 *
 * @param {{ file?: string, cwd?: string, readFile?: typeof readFile }} [options]
 * @returns {Promise<object>}
 */
export async function loadSettings(options = {}) {
  const cwd = options.cwd || process.cwd();
  const file = options.file || resolve(cwd, SETTINGS_FILE);
  const read = options.readFile || readFile;

  let stored = {};
  try {
    stored = JSON.parse(await read(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Malformed file: warn but fall back to defaults rather than crashing.
      console.warn(`[Ignoring unreadable ${SETTINGS_FILE}: ${err.message}]`);
    }
  }

  const merged = mergeSettings(DEFAULT_SETTINGS, stored);
  for (const key of TRANSIENT_KEYS) {
    delete merged[key];
  }
  return merged;
}

/**
 * Resolves the `path` sentinel ("CWD") to an absolute path and strips a trailing slash.
 */
export function resolvePath(settings, cwd = process.cwd()) {
  const raw = !settings.path || settings.path === 'CWD' ? cwd : settings.path;
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/**
 * Writes the persistable subset of `settings` to settings.json.
 * Transient keys and a resolved (non-sentinel) cwd path are not persisted verbatim —
 * if `path` equals `cwd` it is stored as the "CWD" sentinel.
 *
 * @param {object} settings
 * @param {{ file?: string, cwd?: string, writeFile?: typeof writeFile }} [options]
 */
export async function saveSettings(settings, options = {}) {
  const cwd = options.cwd || process.cwd();
  const file = options.file || resolve(cwd, SETTINGS_FILE);
  const write = options.writeFile || writeFile;

  const toStore = deepClone(settings);
  for (const key of TRANSIENT_KEYS) {
    delete toStore[key];
  }
  if (!toStore.path || toStore.path === cwd) {
    toStore.path = 'CWD';
  } else if (toStore.path.length > 1 && toStore.path.endsWith('/')) {
    toStore.path = toStore.path.slice(0, -1);
  }

  await write(file, JSON.stringify(toStore, null, 2));
  return toStore;
}

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import langs from 'langs';

/**
 * Normalizes a language code to its ISO 639-1 (2-letter) form when possible.
 * Accepts 2- or 3-letter codes; unknown codes are returned lower-cased unchanged.
 * `all` is passed through so callers can treat it as "every language".
 *
 * @param {string} code
 * @returns {string}
 */
export function normalizeLang(code) {
  if (!code) {
    return code;
  }
  const lower = String(code).toLowerCase();
  if (lower === 'all') {
    return 'all';
  }
  for (const key of ['1', '2', '2T', '2B', '3']) {
    const match = langs.where(key, lower);
    if (match && match['1']) {
      return match['1'];
    }
  }
  return lower;
}

/**
 * Builds the subtitle filename for a video file and a language:
 * `Movie.2015.mkv` + `en` -> `Movie.2015.en.srt`.
 *
 * @param {string} name video file name (or path)
 * @param {string} lang language code as it should appear in the filename
 * @returns {string}
 */
export function saveAs(name, lang) {
  const dot = name.lastIndexOf('.');
  const stem = dot === -1 ? name : name.slice(0, dot);
  return `${stem}.${lang}.srt`;
}

/**
 * Returns true if at least one requested language is still missing a subtitle file
 * next to the video (so it is worth searching). If every requested language already
 * has a `.lang.srt`, returns false. `all` / unresolvable codes always return true.
 *
 * @param {string} dir directory holding the video file
 * @param {string} file video file name
 * @param {string[]} requestedLangs language codes from the CLI/config
 * @returns {boolean}
 */
export function shouldDownload(dir, file, requestedLangs) {
  const list = Array.isArray(requestedLangs) && requestedLangs.length ? requestedLangs : ['all'];
  for (const raw of list) {
    const lang = normalizeLang(raw);
    if (lang === 'all') {
      return true; // can't know every language is covered — always search
    }
    if (!existsSync(join(dir, saveAs(file, lang)))) {
      return true;
    }
  }
  return false;
}

function hasWantedExtension(file, extensions) {
  if (!extensions || !extensions.length) {
    return true;
  }
  const dot = file.lastIndexOf('.');
  if (dot === -1) {
    return false;
  }
  return extensions.includes(file.slice(dot + 1).toLowerCase());
}

/**
 * Lists video files under `dir`. Directories named `subs` are skipped (that is where
 * this tool writes its output). Unreadable entries are ignored.
 *
 * @param {string} dir
 * @param {object} [options]
 * @param {string[]} [options.extensions] extensions to keep (without the dot)
 * @param {string[]} [options.langs] requested languages, for the "already downloaded" skip
 * @param {boolean} [options.recursive=true] descend into sub-directories
 * @returns {Array<{ fileName: string, path: string, fullName: string }>}
 */
export function walk(dir, options = {}) {
  const { extensions, langs: wantedLangs, recursive = true } = options;
  const out = [];

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    let isDir = entry.isDirectory();
    let isFile = entry.isFile();

    if (entry.isSymbolicLink()) {
      try {
        const stats = statSync(full);
        isDir = stats.isDirectory();
        isFile = stats.isFile();
      } catch {
        continue;
      }
    }

    if (isDir) {
      if (recursive && entry.name !== 'subs') {
        out.push(...walk(full, options));
      }
      continue;
    }

    if (!isFile) {
      continue;
    }

    if (hasWantedExtension(entry.name, extensions) && shouldDownload(dir, entry.name, wantedLangs)) {
      out.push({ fileName: entry.name, path: dir, fullName: full });
    }
  }

  return out;
}

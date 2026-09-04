import { existsSync, readFileSync } from 'node:fs';

/**
 * Loads `KEY=VALUE` pairs from a dotenv-style file into `process.env`.
 *
 * Variables that are already set are left untouched, so real environment variables
 * always win, and — when several files are loaded in sequence — the first file loaded
 * takes precedence over later ones. A missing or unreadable file is a no-op.
 *
 * @param {string} file absolute path to the .env file
 * @returns {boolean} whether a file was found and parsed
 */
export function loadEnvFile(file) {
  if (!existsSync(file)) {
    return false;
  }

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return false;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

export default loadEnvFile;

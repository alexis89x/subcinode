import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSettings, saveSettings, resolvePath, mergeSettings, readCredentials } from './config.js';
import { setLevelFromOptions, log, logLevels } from './logger.js';
import { walk, saveAs } from './files.js';
import { computeHash } from './hash.js';
import { getProvider } from './providers/index.js';
import { downloadFile } from './download.js';
import { insertPromoSub } from './promo.js';

const DOWNLOAD_DELAY_MS = 400;

function delay(ms, deps) {
  if (deps && deps.noDelay) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyPromo(targetPath, deps) {
  const read = deps.readFile || readFile;
  const write = deps.writeFile || writeFile;
  try {
    const srt = await read(targetPath, 'utf8');
    const rewritten = insertPromoSub(srt);
    if (rewritten) {
      await write(targetPath, rewritten);
    }
  } catch (err) {
    log(`[Could not add promo caption to ${targetPath}: ${err.message}]`, logLevels.ERROR);
  }
}

/**
 * Runs the full pipeline: load settings -> scan for videos -> hash -> search the
 * provider -> download -> insert the promo caption.
 *
 * @param {{ cli?: object, save?: boolean, onlySettings?: boolean }} parsed  from {@link parseArgs}
 * @param {object} [deps]  injectable seams for tests (cwd, env, version, providerDeps,
 *                         downloadDeps, readFile, writeFile, noDelay)
 * @returns {Promise<{ settings: object, downloaded: string[], errors: Array<{file:string,error:string}> }>}
 */
export async function run(parsed = {}, deps = {}) {
  const cwd = deps.cwd || process.cwd();
  const env = deps.env || process.env;
  const version = deps.version || '0.0.0';

  const settings = mergeSettings(await loadSettings({ cwd }), parsed.cli || {});
  setLevelFromOptions(settings);

  if (parsed.save) {
    log('[Saving settings]', logLevels.ALL);
    try {
      await saveSettings(settings, { cwd });
      log('[Settings saved]', logLevels.ALL);
    } catch (err) {
      log(`[Error while saving settings: ${err.message}]`, logLevels.ERROR);
    }
  }

  settings.path = resolvePath(settings, cwd);

  if (parsed.onlySettings) {
    console.log(settings);
    return { settings, downloaded: [], errors: [] };
  }

  log('[Navigating path...]', logLevels.ALL);
  const files = walk(settings.path, {
    extensions: settings.extensions,
    langs: settings.langs,
    recursive: settings.recursive
  });
  log(`[Found ${files.length} ${files.length === 1 ? 'file' : 'files'}]`, logLevels.ALL);
  for (const file of files) {
    log(`Found: ${file.fullName}`, logLevels.DEBUG);
  }

  const downloaded = [];
  const errors = [];
  if (!files.length) {
    return { settings, downloaded, errors };
  }

  const credentials = readCredentials(env);
  const provider = getProvider(
    settings.provider,
    { ...credentials, userAgent: `subcinode v${version}` },
    deps.providerDeps || {}
  );

  log('[Connecting to subtitle provider...]', logLevels.ALL);
  await provider.init();

  for (const file of files) {
    try {
      log(`[Hashing ${file.fileName}]`, logLevels.DEBUG);
      const info = await computeHash(file.fullName);

      log(`[Searching subtitles for ${file.fileName}]`, logLevels.ALL);
      const matches = await provider.search(info, { languages: settings.langs });

      // Keep the best (already sorted by download count) match per language.
      const perLang = new Map();
      for (const match of matches) {
        if (!perLang.has(match.langId)) {
          perLang.set(match.langId, match);
        }
      }
      if (!perLang.size) {
        log(`[No subtitles found for ${file.fileName}]`, logLevels.ALL);
        continue;
      }

      const targetDir = settings.useSubs ? join(file.path, 'subs') : file.path;

      for (const match of perLang.values()) {
        const targetName = saveAs(file.fileName, match.langId);
        const targetPath = join(targetDir, targetName);

        if (existsSync(targetPath)) {
          log(`[Skipping ${targetName}, already present]`, logLevels.ALL);
          continue;
        }

        try {
          const { url } = await provider.resolveDownloadUrl(match);
          await downloadFile(url, targetPath, deps.downloadDeps || {});
          await applyPromo(targetPath, deps);
          downloaded.push(targetPath);
          log(`[Downloaded ${targetName}]`, logLevels.ALL);
        } catch (err) {
          errors.push({ file: targetPath, error: err.message });
          log(`[Error downloading ${targetName}: ${err.message}]`, logLevels.ERROR);
        }

        await delay(DOWNLOAD_DELAY_MS, deps);
      }
    } catch (err) {
      errors.push({ file: file.fullName, error: err.message });
      log(`[Error processing ${file.fileName}: ${err.message}]`, logLevels.ERROR);
    }
  }

  log(
    `[Done. Downloaded ${downloaded.length} ${downloaded.length === 1 ? 'subtitle' : 'subtitles'}, ` +
      `${errors.length} ${errors.length === 1 ? 'error' : 'errors'}.]`,
    logLevels.ALL
  );
  log('Thanks for using subcinode! https://github.com/alexis89x/subcinode', logLevels.ALL);

  return { settings, downloaded, errors };
}

export default run;

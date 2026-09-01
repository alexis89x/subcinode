import { OpenSubtitlesProvider } from './opensubtitles.js';

/**
 * Provider registry. A provider is a class implementing:
 *   `name` (getter), `async init()`, `async search(fileInfo, opts)`,
 *   `async resolveDownloadUrl(result)`.
 */
const registry = new Map([['opensubtitles', OpenSubtitlesProvider]]);

export function registerProvider(name, ProviderClass) {
  registry.set(name, ProviderClass);
}

export function availableProviders() {
  return [...registry.keys()];
}

/**
 * @param {string} [name='opensubtitles']
 * @param {object} [config]
 * @param {object} [deps]
 */
export function getProvider(name = 'opensubtitles', config = {}, deps = {}) {
  const ProviderClass = registry.get(name);
  if (!ProviderClass) {
    throw new Error(
      `Unknown subtitle provider "${name}". Available: ${availableProviders().join(', ')}.`
    );
  }
  return new ProviderClass(config, deps);
}

export { OpenSubtitlesProvider };

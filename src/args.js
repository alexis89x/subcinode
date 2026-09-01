import { Command } from 'commander';

function splitList(value) {
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Rewrites the legacy single-dash `-flag=value` token style into the standard
 * `--flag value` form that {@link Command} understands, so documented invocations
 * from older versions keep working.
 *
 * @param {string[]} argv user arguments (no `node`/script entries)
 * @returns {string[]}
 */
export function normalizeLegacyArgv(argv) {
  const out = [];
  for (const token of argv) {
    if (token.startsWith('--')) {
      out.push(token);
      continue;
    }
    const match = /^-([a-zA-Z]+)(?:=(.*))?$/.exec(token);
    if (!match) {
      out.push(token);
      continue;
    }

    const name = match[1].toLowerCase();
    const value = match[2];

    switch (name) {
      case 'langs':
      case 'extensions':
      case 'path':
      case 'provider':
        out.push(`--${name}`);
        if (value !== undefined) {
          out.push(value);
        }
        break;
      case 'usesubs':
        out.push(value === 'false' ? '--no-use-subs' : '--use-subs');
        break;
      case 'recursive':
        out.push(value === 'false' ? '--no-recursive' : '--recursive');
        break;
      case 'save':
        out.push('--save');
        break;
      case 'debug':
        out.push('--debug');
        break;
      case 'settings':
        out.push('--settings');
        break;
      default:
        out.push(token);
    }
  }
  return out;
}

/**
 * Parses CLI arguments (legacy or modern form) into:
 *   `{ cli, save, onlySettings }`
 * where `cli` contains only the options the user actually passed, ready to be merged
 * onto the stored settings.
 *
 * @param {string[]} argv user arguments (typically `process.argv.slice(2)`)
 * @param {{ version?: string, exit?: boolean }} [options]
 */
export function parseArgs(argv, options = {}) {
  const program = new Command();
  program
    .name('subcinode')
    .description('Download the correct subtitles for your local video files.')
    .version(options.version || '0.0.0')
    .option('--provider <name>', 'subtitle provider to use')
    .option('--langs <list>', 'comma-separated language codes, or "all"', splitList)
    .option('--extensions <list>', 'comma-separated video file extensions', splitList)
    .option('--path <dir>', 'directory to scan (default: current directory)')
    .option('--recursive', 'descend into sub-folders')
    .option('--no-recursive', 'do not descend into sub-folders')
    .option('--use-subs', 'save subtitles under a subs/ folder')
    .option('--no-use-subs', 'save subtitles next to the video file')
    .option('--save', 'persist the supplied options as the new defaults')
    .option('--settings', 'print the effective settings and exit')
    .option('--debug', 'verbose logging')
    .allowExcessArguments(true)
    .allowUnknownOption(true);

  if (options.exit === false) {
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });
  }

  program.parse(normalizeLegacyArgv(argv), { from: 'user' });

  const opts = program.opts();
  const fromCli = (name) => program.getOptionValueSource(name) === 'cli';

  const cli = {};
  for (const key of ['provider', 'langs', 'extensions', 'path', 'recursive', 'useSubs', 'debug']) {
    if (fromCli(key)) {
      cli[key] = opts[key];
    }
  }

  return {
    cli,
    save: Boolean(opts.save),
    onlySettings: Boolean(opts.settings)
  };
}

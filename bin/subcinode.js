#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { run } from '../src/run.js';
import { parseArgs } from '../src/args.js';
import { log, logLevels } from '../src/logger.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const parsed = parseArgs(process.argv.slice(2), { version: pkg.version });

run(parsed, { version: pkg.version }).then(
  (result) => {
    process.exitCode = result.errors.length ? 1 : 0;
  },
  (err) => {
    log(`[FATAL: ${err.message}]`, logLevels.FATAL);
    if (process.env.SUBCINODE_DEBUG) {
      console.error(err);
    }
    process.exitCode = 1;
  }
);

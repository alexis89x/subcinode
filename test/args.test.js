import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLegacyArgv, parseArgs } from '../src/args.js';

const parse = (argv) => parseArgs(argv, { exit: false, version: '2.0.0' });

test('normalizeLegacyArgv rewrites the old single-dash style', () => {
  assert.deepEqual(
    normalizeLegacyArgv(['-langs=eng,ita', '-recursive=false', '-useSubs', '-path=/m', '-save', '-debug']),
    ['--langs', 'eng,ita', '--no-recursive', '--use-subs', '--path', '/m', '--save', '--debug']
  );
});

test('normalizeLegacyArgv leaves modern flags untouched', () => {
  const modern = ['--langs', 'en', '--no-recursive'];
  assert.deepEqual(normalizeLegacyArgv(modern), modern);
});

test('parseArgs reports only options the user actually passed', () => {
  const { cli, save, onlySettings } = parse([]);
  assert.deepEqual(cli, {});
  assert.equal(save, false);
  assert.equal(onlySettings, false);
});

test('parseArgs parses the modern form', () => {
  const { cli } = parse(['--langs', 'eng,ita', '--no-recursive', '--use-subs', '--path', '/movies']);
  assert.deepEqual(cli.langs, ['eng', 'ita']);
  assert.equal(cli.recursive, false);
  assert.equal(cli.useSubs, true);
  assert.equal(cli.path, '/movies');
});

test('parseArgs parses the legacy form identically', () => {
  const { cli } = parse(['-langs=eng,ita', '-recursive=false', '-useSubs', '-path=/movies']);
  assert.deepEqual(cli.langs, ['eng', 'ita']);
  assert.equal(cli.recursive, false);
  assert.equal(cli.useSubs, true);
  assert.equal(cli.path, '/movies');
});

test('parseArgs recognises -settings and -save', () => {
  assert.equal(parse(['-settings']).onlySettings, true);
  assert.equal(parse(['-save']).save, true);
});

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

/** Modules and the sibling modules each is allowed to depend on. */
const ALLOWED = {
  shared: [],
  engine: [],
  kv: [],
  rules: [],
  chaos: [],
  origin: [],
  store: ['shared'],
  coordinator: ['engine', 'rules', 'shared'],
  edge: ['engine', 'kv', 'rules', 'chaos', 'shared'],
};

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.js') ? [path] : [];
  });
}

const IMPORT = /from\s+['"](\.\.\/[^'"]+)['"]/g;

test('every source directory is a declared module', () => {
  const dirs = readdirSync(SRC).filter((name) => statSync(join(SRC, name)).isDirectory());
  assert.deepEqual(dirs.sort(), Object.keys(ALLOWED).sort());
});

test('modules only depend on allowed modules through their index file', () => {
  const violations = [];

  for (const file of sourceFiles(SRC)) {
    const [owner] = relative(SRC, file).split(sep);
    const text = readFileSync(file, 'utf8');

    for (const [, specifier] of text.matchAll(IMPORT)) {
      const [, target, ...rest] = specifier.split('/');
      if (target === owner) continue;
      const entry = rest.join('/');
      if (!ALLOWED[owner].includes(target)) {
        violations.push(`${relative(SRC, file)} imports module "${target}"`);
      } else if (entry !== 'index.js') {
        violations.push(`${relative(SRC, file)} reaches into ${target}/${entry}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

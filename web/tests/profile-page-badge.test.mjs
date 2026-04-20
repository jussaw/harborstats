import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fileDir = path.dirname(fileURLToPath(import.meta.url));
const profilePagePath = path.resolve(fileDir, '../app/players/[id]/page.tsx');

test('premium player profiles use the PREMIUM badge label', async () => {
  const source = await readFile(profilePagePath, 'utf8');

  assert.match(source, /PREMIUM/);
  assert.doesNotMatch(source, />\s*Pro\s*</);
});

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [jsonFile, jsFile, globalName] of [
  ['terrain-profiles.json', 'terrain-profiles.js', 'SELENE_TERRAIN'],
  ['horizons-bundle.json', 'horizons-bundle.js', 'SELENE_HORIZONS'],
]) {
  const data = JSON.parse(await readFile(path.join(root, 'data', jsonFile), 'utf8'));
  await writeFile(path.join(root, 'data', jsFile), `window.${globalName}=${JSON.stringify(data)};\n`, 'utf8');
}
console.log('Built local browser data files. The app can now open directly from index.html.');

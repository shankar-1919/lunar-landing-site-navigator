import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This is a one-time dataset builder. The shipped website reads local JSON and
// never calls Horizons. Requests are deliberately sequential and are not retried.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'horizons-exports');
const contact = process.env.HORIZONS_CONTACT?.trim();
if (!contact) throw new Error('Set HORIZONS_CONTACT to a real project contact before requesting JPL data. The bundled dataset is already ready to use.');
const start = process.argv[2] || '2026-11-15';
const hours = Number(process.argv[3] || 24);
const step = process.argv[4] || '10m';
const end = new Date(Date.parse(`${start}T00:00:00Z`) + hours * 3600000).toISOString().replace('T', ' ').slice(0, 16);
if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(hours) || hours <= 0 || hours > 168 || !/^\d+(m|h)$/.test(step)) {
  throw new Error('Usage: node scripts/fetch-horizons.mjs YYYY-MM-DD [hours 1-168] [10m|30m|60m|1h]');
}
await mkdir(outDir, { recursive: true });

const sites = {
  site06: { lon: 37.3666694128, lat: -85.4381004827, altKm: 5.946381 },
  dm2: { lon: 58.82205, lat: -83.95402, altKm: 1.009903 },
};
const jobs = [
  ['site06-sun.txt', '10', sites.site06], ['site06-earth.txt', '399', sites.site06],
  ['dm2-sun.txt', '10', sites.dm2], ['dm2-earth.txt', '399', sites.dm2],
];

for (let i = 0; i < jobs.length; i++) {
  const [filename, target, site] = jobs[i];
  const params = new URLSearchParams({
    format: 'text', COMMAND: `'${target}'`, OBJ_DATA: "'YES'", MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${site.lon},${site.lat},${site.altKm}'`, START_TIME: `'${start} 00:00'`,
    STOP_TIME: `'${end}'`, STEP_SIZE: `'${step}'`, QUANTITIES: "'4'", APPARENT: "'AIRLESS'",
    CSV_FORMAT: "'YES'", TIME_TYPE: "'UT'", CAL_FORMAT: "'CAL'", TIME_DIGITS: "'MINUTES'",
  });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`, {
    headers: { 'User-Agent': `LunarLandingSiteNavigator/1.0 (${contact})` },
  });
  const text = await response.text();
  if (!response.ok || !text.includes('$$SOE') || !text.includes('$$EOE')) {
    throw new Error(`${filename}: Horizons returned HTTP ${response.status}. ${text.slice(0, 500)}`);
  }
  await writeFile(path.join(outDir, filename), text, 'utf8');
  console.log(`Saved ${filename} (${i + 1}/4)`);
  if (i < jobs.length - 1) await new Promise(resolve => setTimeout(resolve, 1800));
}
console.log(`Saved four matching observer tables for ${start} through ${end} UTC. Inspect their headers, then run: node scripts/pack-horizons.mjs horizons-exports`);

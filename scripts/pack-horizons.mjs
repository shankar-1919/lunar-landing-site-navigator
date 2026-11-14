import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.resolve(process.argv[2] || path.join(root, 'horizons-exports'));
const month = Object.fromEntries('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ').map((m, i) => [m.toLowerCase(), i]));
const files = {
  'site06-sun.txt': ['site06', 'sun'],
  'site06-earth.txt': ['site06', 'earth'],
  'dm2-sun.txt': ['dm2', 'sun'],
  'dm2-earth.txt': ['dm2', 'earth'],
};

function splitCsv(line) {
  const cells = [];
  let cell = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += c;
  }
  cells.push(cell.trim());
  return cells;
}

function normalizeTime(text) {
  const m = text.trim().match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})[ T]+(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/);
  if (!m || month[m[2].toLowerCase()] === undefined) return null;
  const millis = Number(`0.${m[7] || '0'}`) * 1000;
  return new Date(Date.UTC(Number(m[1]), month[m[2].toLowerCase()], Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0), Math.round(millis))).toISOString();
}

function parseTable(text, file) {
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex(line => line.includes('$$SOE'));
  const last = lines.findIndex((line, i) => i > first && line.includes('$$EOE'));
  if (first < 0 || last < 0) throw new Error(`${file}: expected a Horizons text table with $$SOE and $$EOE markers.`);
  const headerLine = lines.slice(0, first).reverse().find(line => line.includes('Azi_') && line.includes('Elev_'));
  const header = headerLine ? splitCsv(headerLine) : [];
  const azColumn = header.findIndex(cell => cell.includes('Azi_'));
  const elColumn = header.findIndex(cell => cell.includes('Elev_'));
  if (azColumn < 0 || elColumn < 0 || !header[azColumn].includes('(a-app)') || !header[elColumn].includes('(a-app)')) {
    throw new Error(`${file}: the table must identify airless apparent azimuth and elevation columns.`);
  }
  if (!text.toLowerCase().includes('airless apparent azimuth and elevation of target center')) {
    throw new Error(`${file}: the table does not declare airless apparent target-centre directions.`);
  }
  const targetLine = lines.find(line => line.includes('Target body name:')) || '';
  const expectedTarget = file.includes('-sun') ? /Sun \(10\)/ : /Earth \(399\)/;
  if (!expectedTarget.test(targetLine)) throw new Error(`${file}: target body does not match the expected Sun/Earth ID.`);
  const centerLine = lines.find(line => line.includes('Center body name:')) || '';
  if (!/Moon \(301\)/.test(centerLine) || !centerLine.includes('DE441')) throw new Error(`${file}: expected a DE441 Moon-centred observer table.`);
  if (!header.some(cell => cell.includes('Date__(UT)'))) throw new Error(`${file}: expected a Horizons UT timestamp column.`);
  const observerLine = lines.find(line => line.includes('Center geodetic :')) || '';
  const match = observerLine.match(/Center geodetic\s*:\s*([\d.+-]+),\s*([\d.+-]+),\s*([\d.+-]+)/);
  const [expectedLon, expectedLat, expectedAlt] = file.startsWith('site06')
    ? [37.3666694, -85.4381005, 5.946381] : [58.82205, -83.95402, 1.009903];
  if (!match || Math.abs(Number(match[1]) - expectedLon) > 0.00001 || Math.abs(Number(match[2]) - expectedLat) > 0.00001 || Math.abs(Number(match[3]) - expectedAlt) > 0.001) {
    throw new Error(`${file}: lunar observer coordinates/altitude do not match the cited DEM centre. Check the source header.`);
  }
  const frameLine = lines.find(line => line.includes('Center pole/equ :')) || '';
  if (!frameLine.includes('MEAN_ME (high precision)')) throw new Error(`${file}: expected the Horizons MEAN_ME high-precision lunar orientation.`);
  const result = [];
  for (const raw of lines.slice(first + 1, last)) {
    if (!raw.trim()) continue;
    const cells = raw.includes(',') ? splitCsv(raw) : raw.trim().split(/\s+/);
    let time = normalizeTime(cells[0] || '');
    if (!time && cells.length > 1) time = normalizeTime(`${cells[0]} ${cells[1]}`);
    // Prefer columns identified by Horizons' header. CSV rows can contain
    // marker fields and trailing blanks, which must not be mistaken for 0°.
    let angles = null;
    if (azColumn >= 0 && elColumn >= 0) {
      const az = Number(cells[azColumn]), el = Number(cells[elColumn]);
      if (Number.isFinite(az) && az >= 0 && az < 360 && Number.isFinite(el) && el >= -90 && el <= 90) angles = { az, el };
    } else {
      const numeric = cells.filter(cell => cell !== '' && Number.isFinite(Number(cell))).map(Number);
      const [az, el] = numeric.slice(-2);
      if (Number.isFinite(az) && az >= 0 && az < 360 && Number.isFinite(el) && el >= -90 && el <= 90) angles = { az, el };
    }
    if (time && angles) result.push({ time, ...angles });
  }
  if (!result.length) throw new Error(`${file}: no valid AZ/EL rows found. Use observer quantity 4 and airless apparent coordinates.`);
  return result;
}

const sites = { site06: { sun: null, earth: null }, dm2: { sun: null, earth: null } };
for (const [file, [site, body]] of Object.entries(files)) {
  const content = await readFile(path.join(inputDir, file), 'utf8');
  sites[site][body] = parseTable(content, file);
}

const baseline = sites.site06.sun.map(p => p.time);
if (baseline.length < 2) throw new Error('A duration analysis needs at least two timestamps per Horizons table.');
const baseStepMs = Date.parse(baseline[1]) - Date.parse(baseline[0]);
if (baseStepMs <= 0) throw new Error('Timestamps must be strictly increasing.');
for (const [site, data] of Object.entries(sites)) for (const body of ['sun', 'earth']) {
  if (data[body].length !== baseline.length || data[body].some((p, i) => p.time !== baseline[i])) {
    throw new Error(`${site}-${body}: timestamps do not match the Site06 Sun table. Export all four tables with the same UTC start, stop, and step.`);
  }
  for (let i = 1; i < data[body].length; i++) {
    if (Date.parse(data[body][i].time) - Date.parse(data[body][i - 1].time) !== baseStepMs) {
      throw new Error(`${site}-${body}: timestamps are not evenly spaced; export a regular Horizons time step.`);
    }
  }
}

const startTime = baseline[0];
const stopTime = baseline.at(-1);
const stepMinutes = Math.round(baseStepMs / 60000);
if (stepMinutes <= 0) throw new Error('Timestamps must be strictly increasing.');
const bundle = {
  schemaVersion: 1,
  source: 'JPL Horizons observer tables, imported from local text exports',
  sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
  startTime,
  stopTime,
  windowHours: (Date.parse(stopTime) - Date.parse(startTime)) / 3600000,
  stepMinutes,
  sampleOnly: false,
  sourceSettingsValidatedFromHeaders: 'Sun (10) and Earth (399); Moon (301) observer; geodetic east longitude, latitude, altitude in km; Horizons AZI_(a-app) and Elev_(a-app) airless apparent target-center directions; UT; regular time step. Packer checks each target, site coordinate, and lunar orientation label.',
  frameNote: 'Horizons output uses MEAN_ME (high precision) with DE441. The LOLA DEM uses MOON_ME / DE421. The cross-solution orientation residual is not quantified.',
  sites,
};
const out = path.join(root, 'data', 'horizons-bundle.json');
await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`Wrote ${out} from four matching Horizons tables (${baseline.length} epochs; ${stepMinutes} minute step).`);

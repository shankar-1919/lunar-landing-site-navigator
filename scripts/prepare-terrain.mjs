import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [site06Path, dm2Path] = process.argv.slice(2);
if (!site06Path || !dm2Path) {
  console.error('Usage: node scripts/prepare-terrain.mjs <Site06_surface.tif> <DM2_surface.tif>');
  process.exit(2);
}

const R = 1_737_400;
const MAX_RANGE = 10_000;
const STRIDE = 2; // 10 m sampling from the nominal 5 m raster.
const BIN_WIDTH = 0.25;
const BIN_COUNT = 360 / BIN_WIDTH;
const SITE_INFO = [
  { key: 'site06', name: 'Nobile Rim 1', file: site06Path, published: { lat: -85.4381, lon: 37.36667 }, height: 5946.381 },
  { key: 'dm2', name: 'Nobile Rim 2', file: dm2Path, published: { lat: -83.954, lon: 58.82206 }, height: 1009.903 },
];

function readIfd(buf) {
  if (buf.toString('ascii', 0, 2) !== 'II' || buf.readUInt16LE(2) !== 42) throw new Error('Expected a little-endian classic TIFF.');
  const ifd = buf.readUInt32LE(4);
  const n = buf.readUInt16LE(ifd);
  const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };
  const tags = new Map();
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    const tag = buf.readUInt16LE(e), type = buf.readUInt16LE(e + 2), count = buf.readUInt32LE(e + 4);
    const size = sizes[type] * count;
    const offset = size <= 4 ? e + 8 : buf.readUInt32LE(e + 8);
    if (offset + size > buf.length) throw new Error(`TIFF tag ${tag} extends beyond the file.`);
    const values = [];
    for (let j = 0; j < count; j++) {
      const p = offset + j * sizes[type];
      if (type === 2) values.push(String.fromCharCode(buf[p]));
      else if (type === 3) values.push(buf.readUInt16LE(p));
      else if (type === 4 || type === 13) values.push(buf.readUInt32LE(p));
      else if (type === 12) values.push(buf.readDoubleLE(p));
      else values.push(buf[p]);
    }
    tags.set(tag, { type, count, values: type === 2 ? values.join('') : values });
  }
  return tags;
}

function toLatLon(x, y) {
  const rho = Math.hypot(x, y);
  const colat = 2 * Math.atan(rho / (2 * R));
  return { lat: -Math.PI / 2 + colat, lon: Math.atan2(x, y) };
}

function xyz(lat, lon, heightM) {
  const radius = R + heightM;
  const c = Math.cos(lat);
  return [radius * c * Math.cos(lon), radius * c * Math.sin(lon), radius * Math.sin(lat)];
}

async function processSite(site) {
  const buf = await readFile(site.file);
  const tags = readIfd(buf);
  const get = (id, label) => {
    const tag = tags.get(id);
    if (!tag) throw new Error(`${site.name}: TIFF is missing ${label}.`);
    return tag.values;
  };
  const [width] = get(256, 'ImageWidth'), [height] = get(257, 'ImageLength');
  const [bits] = get(258, 'BitsPerSample'), [compression] = get(259, 'Compression');
  const [samples] = get(277, 'SamplesPerPixel'), [sampleFormat] = get(339, 'SampleFormat');
  const scale = get(33550, 'ModelPixelScale'), tie = get(33922, 'ModelTiepoint');
  const [x0, y0] = [tie[3], tie[4]];
  const [sx, sy] = [scale[0], scale[1]];
  const stripOffsets = get(273, 'StripOffsets');
  const stripBytes = get(279, 'StripByteCounts');
  if (width !== 4000 || height !== 4000 || bits !== 32 || compression !== 1 || samples !== 1 || sampleFormat !== 3 || sx !== 5 || sy !== 5) {
    throw new Error(`${site.name}: raster layout differs from the inspected product; stop rather than guess.`);
  }
  if (stripOffsets.length !== height || stripBytes.length !== height) throw new Error(`${site.name}: expected one TIFF strip per row.`);

  const centerCol = Math.floor(width / 2), centerRow = Math.floor(height / 2);
  const centerX = x0 + centerCol * sx;
  const centerY = y0 - centerRow * sy;
  const centerZ = buf.readFloatLE(stripOffsets[centerRow] + centerCol * 4);
  if (!Number.isFinite(centerZ)) throw new Error(`${site.name}: center pixel is nodata.`);
  const centerGeo = toLatLon(centerX, centerY);
  const latDeg = centerGeo.lat * 180 / Math.PI;
  let lonDeg = centerGeo.lon * 180 / Math.PI;
  if (lonDeg < 0) lonDeg += 360;
  if (Math.abs(latDeg - site.published.lat) > 0.002 || Math.abs(lonDeg - site.published.lon) > 0.002 || Math.abs(centerZ - site.height) > 2) {
    throw new Error(`${site.name}: center pixel does not match the NASA reference coordinate/height within the expected tolerance.`);
  }

  const observer = xyz(centerGeo.lat, centerGeo.lon, centerZ);
  const [ox, oy, oz] = observer;
  const up = [Math.cos(centerGeo.lat) * Math.cos(centerGeo.lon), Math.cos(centerGeo.lat) * Math.sin(centerGeo.lon), Math.sin(centerGeo.lat)];
  const east = [-Math.sin(centerGeo.lon), Math.cos(centerGeo.lon), 0];
  const north = [-Math.sin(centerGeo.lat) * Math.cos(centerGeo.lon), -Math.sin(centerGeo.lat) * Math.sin(centerGeo.lon), Math.cos(centerGeo.lat)];
  const horizons = Array(BIN_COUNT).fill(-90);
  const coverage = Array(BIN_COUNT).fill(0);
  let sampled = 0, missing = 0;
  for (let row = 0; row < height; row += STRIDE) {
    const rowY = y0 - row * sy;
    const strip = stripOffsets[row];
    if (stripBytes[row] < width * 4) throw new Error(`${site.name}: TIFF row is shorter than expected.`);
    for (let col = 0; col < width; col += STRIDE) {
      const x = x0 + col * sx;
      const dx = x - centerX, dy = rowY - centerY;
      const mapRange = Math.hypot(dx, dy);
      if (mapRange < 5 || mapRange > MAX_RANGE) continue;
      const z = buf.readFloatLE(strip + col * 4);
      if (!Number.isFinite(z)) { missing++; continue; }
      const geo = toLatLon(x, rowY);
      const p = xyz(geo.lat, geo.lon, z);
      const vx = p[0] - ox, vy = p[1] - oy, vz = p[2] - oz;
      const e = vx * east[0] + vy * east[1] + vz * east[2];
      const n = vx * north[0] + vy * north[1] + vz * north[2];
      const u = vx * up[0] + vy * up[1] + vz * up[2];
      const az = (Math.atan2(e, n) * 180 / Math.PI + 360) % 360;
      const bin = Math.floor(az / BIN_WIDTH) % BIN_COUNT;
      const elevation = Math.atan2(u, Math.hypot(e, n)) * 180 / Math.PI;
      if (elevation > horizons[bin]) horizons[bin] = elevation;
      if (mapRange > coverage[bin]) coverage[bin] = mapRange;
      sampled++;
    }
  }
  const minCoverage = Math.min(...coverage);
  const maxCoverage = Math.max(...coverage);
  return {
    key: site.key,
    name: site.name,
    productId: site.key === 'site06' ? 'Site06_final_adj_5mpp_surf.tif' : 'DM2_final_adj_5mpp_surf.tif',
    center: { latitudeDeg: latDeg, eastLongitudeDeg: lonDeg, xM: centerX, yM: centerY, elevationM: centerZ },
    raster: { width, height, pixelSpacingM: sx, dataType: 'Float32', nodata: 'NaN', projection: 'South polar stereographic; R=1,737,400 m; scale=1; origin at X=0,Y=0', frame: 'MOON_ME / DE421', pixelRegistration: 'center' },
    skyline: { horizonDeg: horizons, maxRangeByAzimuthM: coverage, minRangeM: minCoverage, maxRangeM: maxCoverage, binWidthDeg: BIN_WIDTH, sampleSpacingM: STRIDE * sx, sampleCount: sampled, skippedNodataCount: missing, method: 'Spherical ECEF terrain rays projected into local east/north/up; horizon is the maximum terrain elevation per azimuth bin.' },
  };
}

const results = await Promise.all(SITE_INFO.map(processSite));
const output = {
  generatedAt: new Date().toISOString(),
  source: 'NASA GSFC PGDA LOLA South Pole high-resolution site DEMs; cite Barker et al. (2021), DOI 10.1016/j.pss.2020.105119.',
  sourcePage: 'https://pgda.gsfc.nasa.gov/products/78',
  dataBook: 'NASA Lunar Surface Data Book M2M-30044, Table A2.1-1; center points derived from PGDA DEM products.',
  horizonRadiusMeters: MAX_RANGE,
  binWidthDeg: BIN_WIDTH,
  limitation: 'Terrain outside each 20 km × 20 km regional file is not included. The local skyline is not a complete long-range horizon.',
  sites: Object.fromEntries(results.map(item => [item.key, item])),
};
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data', 'terrain-profiles.json'), JSON.stringify(output));
console.log(`Wrote data/terrain-profiles.json from two verified NASA DEMs.`);
for (const site of results) console.log(`${site.name}: ${site.skyline.sampleCount.toLocaleString()} terrain samples; azimuth-bin coverage ${site.skyline.minRangeM.toFixed(0)}–${site.skyline.maxRangeM.toFixed(0)} m; center ${site.center.latitudeDeg.toFixed(5)}°, ${site.center.eastLongitudeDeg.toFixed(5)}° E, ${site.center.elevationM.toFixed(2)} m.`);

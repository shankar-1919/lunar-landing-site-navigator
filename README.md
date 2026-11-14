# ASTRO — Lunar Landing Site Navigator

An offline-first web app for comparing modeled Sun and Earth line-of-sight at two lunar south-pole reference sites. It includes LOLA-derived local terrain skylines and a seven-day JPL Horizons time series, sampled every 10 minutes.

## Open the project

Double-click `index.html` to open the complete app directly in Chrome. The data is bundled locally, so no server is needed.

For local development, open the folder in Visual Studio Code, open **Terminal → New Terminal**, run `npm start`, and visit `http://127.0.0.1:4173`. Node.js 18 or later is needed for this optional server. The website itself does not call the Horizons API.

## Use the app

- Choose a UTC start date from **November 15–21, 2026**.
- Choose a 24-hour, 3-day, or 7-day window that fits in the available data.
- Choose 10-, 30-, or 60-minute sampling.
- Switch between Site A (Nobile Rim 1) and Site B (Nobile Rim 2) to view each local sky.
- Click either timeline to inspect the Sun and Earth direction at a sampled time.
- Open **View Sources** for source links and the method summary.

Windows outside the bundled range are not extrapolated. Load a separately prepared Horizons bundle with **Load Horizons Bundle** if you have other dates.

## Bundled data and what the numbers mean

`data/horizons-bundle.json` contains 1,009 aligned epochs from **2026-11-15 00:00 UTC to 2026-11-22 00:00 UTC**, at 10-minute spacing, for the Sun and Earth at both sites. Browser-ready copies are in `data/horizons-bundle.js` and `data/terrain-profiles.js`; these let Chrome read the data without a server. The four source tables are preserved in `horizons-exports/`.

The app samples LOLA elevation within 10 km of each DEM centre, computes a skyline in 0.25° azimuth bins while accounting for lunar curvature, and compares each Horizons body-centre direction with that skyline. The duration is a discrete interval estimate at the selected sample step; it is not event-time precision. Sun visibility is not a power estimate. Earth-centre visibility is not a communication link. The app omits the full Earth disk, antenna geometry, relay availability, radio link budget, array orientation, shadows from terrain beyond the DEM patch, and landing hazard/slope analysis.

The two DEMs are 4,000 × 4,000 Float32 GeoTIFFs at nominal 5 m grid spacing in MOON_ME / DE421. PGDA reports that about 90% of nominal 5 m cells are interpolated, so grid spacing is not independent terrain resolution. Each terrain patch covers 20 km × 20 km; the profile uses a 10 km radius from its centre. Site06 centre: 85.4381005° S, 37.3666694° E, 5.946381 km. DM2 centre: 83.95402° S, 58.82205° E, 1.009903 km.

Horizons output headers identify Sun (10), Earth (399), Moon observer (301), the geodetic site coordinates, airless apparent AZ/EL centre angles, UT times, and the MEAN_ME high-precision orientation with DE441. The DEM labels its frame MOON_ME / DE421. Their cross-solution orientation residual has not been quantified, so the result is a transparent comparison prototype, not survey-grade or operational mission guidance.

## Data source refresh (optional)

The included data is ready to run. To make a new static dataset, request tables one at a time and bundle them locally:

```sh
# PowerShell: set this to a real team contact address or public project page first.
$env:HORIZONS_CONTACT = "<your project contact>"
npm run fetch:ephemeris -- 2026-11-15 24 10m
npm run pack:ephemeris
```

The fetcher saves four Horizons text tables to `horizons-exports/`; the packer checks table headers, target IDs, DEM-centre coordinates, frame label, valid angles, matching timestamps, and regular spacing. After changing a JSON data file, regenerate the browser-ready copies with `node scripts/build-browser-data.mjs`. The fetcher does not retry on service errors. The app itself does not make remote ephemeris calls, following [JPL’s API service policy](https://ssd-api.jpl.nasa.gov/doc/index.php).

To rebuild the terrain profile from NASA’s original DEMs, download [Site06](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif) and [DM2](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif), then run:

```sh
node scripts/prepare-terrain.mjs "path/to/Site06_final_adj_5mpp_surf.tif" "path/to/DM2_final_adj_5mpp_surf.tif"
```

## Submission and judging materials

- [GitHub and Vercel publish steps](PUBLISH.md)
- [Submission-ready project text](SUBMISSION-PACKAGE.md)
- [Research and source inventory](RESEARCH-AND-SOURCES.md)
- [Walkthrough and judging guide](JUDGING-GUIDE.md)

The official 2026 challenge submission closes November 15 at 11:59 p.m. in the registered event’s local time. The team lead must submit this project through the official Space Apps team page; this local folder is not a public website.

## Sources and credit

- NASA GSFC PGDA, [high-resolution LOLA south-pole site DEMs](https://pgda.gsfc.nasa.gov/products/78); Barker et al. (2021), [DOI: 10.1016/j.pss.2020.105119](https://doi.org/10.1016/j.pss.2020.105119).
- NASA, [Lunar Surface Data Book M2M-30044](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf), Table A2.1-1.
- NASA/JPL, [Horizons](https://ssd.jpl.nasa.gov/horizons/), [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html), and [API service policy](https://ssd-api.jpl.nasa.gov/doc/index.php).

ASTRO is an independent challenge project and is not endorsed by NASA.

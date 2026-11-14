# Lunar Landing Site Navigator — research baseline

## Current build update — 2026-11-15

This document began as a staged research log, so later sections preserve what was known at each step. The current project now includes four sequentially retrieved JPL Horizons observer tables, spanning **2026-11-15 00:00 UTC to 2026-11-22 00:00 UTC at 10-minute spacing** (1,009 epochs per body/site series). The raw tables are in `horizons-exports/` and the validated app bundle is `data/horizons-bundle.json`. The bundle generator checks target IDs, expected observer coordinates, airless apparent azimuth/elevation headers, MEAN_ME high-precision orientation labels, matching epochs, and regular time spacing. It does not independently quantify the orientation residual between Horizons DE441 and LOLA DE421.

The bundled data makes the app’s one-, three-, and seven-day *geometric centre visibility* estimates usable offline for dates within its coverage. Those values do not establish power generation or direct-to-Earth radio-link availability. See the current limitations in `README.md` and the field-ready explanation in `SUBMISSION-PACKAGE.md`.

**Status:** first research pass, 15 November 2026. This is a source and design baseline, not a claim of flight or mission-planning certification. The challenge is to compare lunar landing locations and dates by showing Sun/Earth geometry relative to local horizons and assessing sunlight and direct-to-Earth visibility.

## 1. Source inventory

| Source | What it can support | Format / access | Spatial and temporal characteristics | Frames / coordinate notes | Use, license, caveats, citation |
|---|---|---|---|---|---|
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) and [API docs](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Apparent Sun and Earth directions as observed at a specified lunar surface site; topocentric azimuth/elevation at requested epochs; independent ephemeris reference | Web UI; JSON/text HTTP GET at `https://ssd.jpl.nasa.gov/api/horizons.api`; file-based HTTP POST documented. Observer ephemeris (`EPHEM_TYPE=OBSERVER`), body target, `CENTER=coord@301`, `COORD_TYPE=GEODETIC`, `SITE_COORD=E-long,lat,alt`; choose quantities and time steps | User selects time span and step. Horizons’ output sampling is not itself a promise of event-time precision; refine around crossings. Availability depends on target/time-span | Site inputs are geodetic/planetodetic east longitude, latitude, altitude. Moon rotations use high-precision lunar models; Moon example coordinates are mean-Earth reference frame/ellipsoid. Confirm output reference/aberration settings and body IDs in request | JPL says API is automated and observer tables support topocentric sites on major bodies. Use API docs and Horizons manual as primary references. No fee/account indicated. NASA/JPL scientific data reuse is generally open, but cite the service and check any supplied third-party material. Risks: output apparent direction ≠ terrain visibility; Earth limb/shape and local terrain still need explicit masks; radio link feasibility needs antenna and link-budget assumptions. Citation: Giorgini et al., JPL Horizons System, current manual/API (URLs at left). |
| [LOLA GDR DEM / PDS Geosciences Node ODE](https://ode.rsl.wustl.edu/moon/) — [GDRDEM definition and product table](https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/Lunar%20Reconnaissance%20Orbiter%20%28LRO%29/LOLA/GDR/GDRDEM.htm) | Elevation, local slope, terrain horizon and line-of-sight occlusion | PDS products with detached labels and binary image data; ODE browser search/download. Common gridded products are 16-bit; labels encode scale/offset. Product IDs include `LRO-L-LOLA-4-GDR-V1.0`, DOI [10.17189/1520642](https://doi.org/10.17189/1520642) | Global equirectangular: 4–1024 px/degree; listed latitude pixel scales from 7.58 km to ~29.6 m. Polar stereographic high-latitude products include 100, 60, 30 and 20 m pixels for coverage to 45°, 60°, 75° and 80° respectively. These are grid spacings, not guaranteed independent terrain resolving power. | ODE says standard global grids are equirectangular; high-resolution polar grids are polar stereographic. LOLA labels use Moon ME/polar-axis DE421 conventions and nominal 1,737.4 km radius; inspect each product label. Reproject to a single verified lunar frame; do not merely relabel coordinates. | PDS archive is the authoritative download/citation path. Cite product DOI and Smith et al. / LOLA product documentation associated with the product. NASA scientific data is generally openly reusable; preserve citation and inspect product-specific metadata. Caveats: gridding/interpolation smooths unresolved hazards; a DEM cell can conceal boulders/roughness; product coverage and quality vary. |
| [NASA Moon Trek](https://trek.nasa.gov/moon/) and [WMTS API docs](https://trek.nasa.gov/tiles/apidoc/) | Discovery, interactive inspection, map layers/tiles, context imagery, slope and surface-lighting tools; possible tile basemap in app | Browser application; layer catalog and downloads; OGC REST WMTS tiles (GetCapabilities and layer-specific tile paths; see API docs) | Per-layer metadata determines pixel size and coverage; Trek lists thousands of products and multiple projections/basemaps. Time-dependent tools/data require layer-specific temporal metadata. | Application supports global, north- and south-pole maps; each product has its own projection and frame. Read item metadata before combining with LOLA or Horizons. | NASA describes all Trek data/basic functionality as public without registration; some advanced mission-planning/science tools require a registered account. Treat map layer product as the cited source, not “Moon Trek” alone. Cite layer title, producing mission/instrument, dataset/product identifier and DOI/URL. Caveat: UI availability or login-limited tools may not be dependable in a hackathon deployment. |
| [LROC QuickMap](https://quickmap.lroc.asu.edu/) and [LROC Terms & Citation](https://www.lroc.im-ldi.com/about/terms) | Interactive inspection of LRO imagery/topography and layer discovery; useful visual cross-check against app outputs | Web mapping application; LROC supports Lunaserv WMS for map access; inspect WMS GetCapabilities and layer metadata before wiring requests. Data products are also archived through PDS/ODE. | Resolution varies by selected imagery/topographic layer; no single resolution can be assigned to QuickMap itself. Some camera products reach much finer sampling than LOLA grids. Static/derived layers may have their own observation/acquisition times. | Layer-dependent projection and datum; check service metadata or original PDS label for each chosen layer. | LROC terms request credit such as “NASA/GSFC/Arizona State University” for educational/news uses and provide data citations. Review full terms for the exact asset and use. The user-shared QuickMap URL’s `stack`/`defs` identifiers remain unverified; do not infer layer identity from those values. Dynamic web map imagery is not a substitute for downloadable, versioned science data. |
| [NASA LRO/LOLA south polar maps (PGDA)](https://pgda.gsfc.nasa.gov/products/90) | Convenient high-resolution south-polar DEM/COG for a regional MVP and terrain horizon analysis | Cloud-optimized GeoTIFFs available from NASA GSFC Planetary Geodesy and Cartography Working Group product page | Regional products, source page describes file coverage/products; use the selected COG’s metadata for exact pixel spacing, extent and nodata | Page says south-polar stereographic X/Y metres, MOON_ME frame of JPL DE421. Validate axis order and map parameters from raster metadata | NASA-hosted product; cite product page and underlying LOLA data. For hackathon, likely easier than full PDS ingestion. Still check the individual file metadata/license/citation and coverage around chosen sites. |
| [NASA/USGS lunar grid and projection guide](https://pubs.usgs.gov/tm/11/e1/tm11E1.pdf) | Coordinate and map projection conventions for south-pole display and reporting | Technical report PDF | Not an ephemeris or terrain raster | Describes lunar polar stereographic and grid north; south polar map parameters include nominal lunar radius 1,737,400 m | Use to document map north vs geographic north and to prevent misleading compass/heading display. Cite USGS Techniques and Methods 11-E1. |
| [Space Apps 2026 Challenge 10](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) | Requirement and judging relevance | Challenge web page | N/A | N/A | Challenge text explicitly asks for comparison of candidate sites and dates, Sun/Earth positions relative to horizon, power potential and DTE windows. This is a requirements source, not a scientific dataset. |
| [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) | Reuse/citation rules for NASA imagery and marks | Web guidance | N/A | N/A | NASA content is generally usable for informational/educational purposes subject to conditions; NASA insignia/identifiers are protected and must not imply endorsement. Third-party images/materials may have separate terms. Data rights remain product-specific. |

### Sources checked and what is verified

- JPL Horizons supports observer-table ephemerides and user-defined topocentric sites on bodies with rotation models; its API exposes `CENTER`, `SITE_COORD`, coordinate type, time step and observer output settings.
- ODE’s LOLA GDRDEM page documents binned/interpolated elevation grids, distinct global and polar projections, pixel sizes, and product DOI. Do not describe every pixel spacing as true terrain resolving power.
- Moon Trek publishes WMTS layer services; its public UI distinguishes generally available data/basic features from some account-gated advanced tools.
- Lunaserv is described by its maintainers as a WMS implementation developed for LROC at ASU. Specific layer endpoints/availability must be obtained from service capabilities at implementation time.
- A map layer title or screenshot does not prove its underlying data, epoch, coordinate frame, or pixel resolution. Record those from the product record/label.

## 2. Scientifically defensible architecture

**Frontend:** React/TypeScript map-and-timeline interface. A polar stereographic map for spatial selection and a linked local-horizon plot showing azimuth/elevation of Sun and Earth. Keep map north convention explicit; label the selected datum/frame and elevation source.

**Data preparation:** Download one versioned LOLA polar DEM subset for a compact south-pole test region. Preserve source files and labels. In a reproducible preprocessing step, decode scale/offset/nodata, reproject only if needed, and produce a documented local DEM grid. Add an optional QuickMap/Moon Trek basemap only after confirming access terms and layer metadata; use PDS/ODE data as the analysis source of truth.

**Ephemerides:** A small backend adapter requests Horizons observer tables for the selected lunar site and interval, separately for Sun and Earth, with explicit time scale, coordinate type, site coordinates, output quantities, and request provenance. Cache by site/time/frame/settings. Store raw response with retrieval time and parsed values. Avoid undocumented third-party orbital calculations in MVP.

**Local horizon:** From the selected DEM cell, compute azimuth-binned maximum elevation angle over a stated radius and observer height. For azimuth `A`, horizon angle is the maximum of `atan2(z_terrain - z_observer, horizontal_distance)` along the sampled terrain rays. State bin width, range, interpolation and DEM resolution. Then an ephemeris direction is terrain-visible only when its elevation exceeds the horizon angle in that azimuth bin (with a stated numerical margin). This is a DEM visibility estimate, not a full ray-traced radio propagation model.

**Sunlight estimate:** Sample Sun azimuth/elevation at a documented cadence, apply terrain horizon mask, and integrate visible intervals over the selected window. Report interval duration and fraction of sampled time sunlit. Optional first-order plane-of-array proxy: `max(0, cos(incidence))`; this is geometric illumination only, not watts, battery state, thermal safety, or mission power margin.

**Earth/DTE estimate:** Compare Earth center/limb apparent direction against terrain horizon. For the simplified product, count geometric terrain line-of-sight windows to Earth’s apparent disk and label them “geometric DTE visibility.” Actual usable communications require spacecraft antenna field-of-view, attitude, link budget, frequency, occultation/refraction/plasma constraints, ground-station and relay/network availability; none is established by the visibility plot alone.

**Output:** Compare 2–3 sites × selected dates on one normalized timeline; show uncertainty/quality labels, source and assumptions on every metric; export a compact report with cited dataset IDs and query settings.

## 3. MVP scope and sequence

1. Choose 2–3 named south-pole comparison sites, including one user-selected point; show coordinates, frame and DEM coverage.
2. Load one LOLA polar DEM region and render elevation plus slope/context. Do not claim hazard certification.
3. Pull Horizons Sun/Earth observer directions for one lunar day or user-selected window. Save raw query and parsed results.
4. Build and visualize a DEM-derived azimuth horizon profile for each point; plot Sun/Earth tracks against it.
5. Integrate terrain-masked sunlight duration and geometric Earth-visible intervals at, initially, 10-minute sampling; refine crossing times around each detected transition.
6. Add side-by-side site/date comparison, map-time brushing, source panel and exportable evidence/citation card.
7. Polish accessibility and storytelling; add an educational “what this score means” panel.

**Defer:** mission-grade solar-array energy, detailed thermal model, high-resolution boulder/hazard detection, probabilistic DEM/ephemeris uncertainty propagation, full radio link budget, lander/rover attitude constraints, relay satellites, global multi-source harmonization, and flight certification. These need extra requirements/data/validation beyond a hackathon MVP.

## 4. Validation plan

- **Ephemeris sanity:** Reproduce a small set of site/time queries in Horizons UI and API; compare direction/time scales and document settings. Test Moon body/site input and east longitude sign explicitly.
- **Frame checks:** Overlay DEM sample coordinates and known landmarks in Moon Trek/QuickMap; verify projection, frame, longitude convention and polar grid orientation. Use at least two control points away from the pole.
- **Terrain horizon:** Synthetic tests: flat plane, single ridge, and an unobstructed spherical horizon. Check expected azimuths/angles and nodata handling. Compare selected-site profiles with an independent GIS/terrain profile or Trek/QuickMap where available.
- **Sunlight windows:** Compare predicted Sun visibility transitions against a second independent implementation/tool or a verified Trek/QuickMap lighting result for carefully selected times. Do not use the same algorithm/data path as both test and reference.
- **Earth windows:** Cross-check Horizons’ apparent elevation and independently compute terrain masking. Verify that “Earth above geometric horizon” is kept distinct from “terrain visible” and from link availability.
- **Resolution sensitivity:** Repeat with a coarser DEM and different ray/bin sampling. Report changes in sunlight/DTE windows as a sensitivity range, especially near ridges.
- **Temporal convergence:** Compare 10-minute, 2-minute and 30-second cadence around transitions; refine root/crossing time and publish the chosen cadence/error bound.
- **Traceability:** Save DEM product ID/checksum, source URLs, Horizons query parameters/raw response, algorithm version, and every approximation with the result.

## 5. UX/design concept

A clean “mission desk” with three synchronized views: (1) south-pole map with selectable pins and shaded terrain, (2) horizon dome/azimuth-elevation plot with distinct Sun and Earth traces and ridge silhouette, (3) a date timeline with sunlight and Earth-visible bands. A comparison drawer should show plain-language metrics and confidence/coverage warnings, not a composite “best site” score by default. Let users choose weights only as an explicitly educational scenario. Always state “geometric visibility estimate; not mission certification.” Provide a novice path (“Why does a ridge block Earth?”) and a technical drawer with frames, product IDs, API settings and method.

Visual hierarchy: readable high-contrast labels, color-safe Sun/Earth encoding plus line styles/icons, keyboard-accessible controls, map scale and grid north cue, time-zone control with UTC default, and source citations beside each derived metric. Prefer authentic cited mission imagery or data-derived terrain; do not use generated imagery as if it were observed lunar data.

## 6. Judging strategy mapped to criteria

| Criterion | Evidence to show |
|---|---|
| Impact | Demonstrate that a planner can compare sites/dates quickly; explain operational value of power and communication visibility, and who benefits. Frame the tool as decision support. |
| Creativity | Make the horizon profile and time scrubber work together; turn difficult geometry into an explainable visual; show both planner and public modes. |
| Validity | Live or reproducible Horizons query, traceable LOLA product, explicit frames and assumptions, cross-checks, cadence/DEM sensitivity, and honest limitations. This is the strongest differentiator. |
| Relevance | Map every feature to Challenge 10 requirements: site/date comparison, Sun/Earth relative to horizon, sunlight duration/power potential, DTE visibility. |
| Presentation | 60–90 second scenario: choose two sites, scrub a date, reveal one ridge blocking Earth and a different sunlight trade-off; finish on source/method card and limitations. Use a rehearsed backup recording and pre-cached data if network calls fail. |

## 7. Assumptions and unresolved checks

**Assumptions for MVP:** selected sites are surface points; terrain DEM is static; Horizons direction is adequate for the short demonstration interval; a local horizon radius and observer height can be set explicitly; first-order illumination is enough for educational comparison.

**Approximations:** sampled ephemerides and terrain rays; gridded DEM and interpolation; a simplified spherical apparent Earth disk unless a better shape model is implemented; no array articulation, thermal state, communications link budget or relay geometry.

**Need validation before claiming:** exact selected QuickMap/Moon Trek layer products, metadata and access behavior; exact NASA/partner reuse conditions per product; LOLA file scaling/nodata and map parameters; Horizons output options for desired apparent azimuth/elevation and timing; local-horizon algorithm and event-time sensitivity.

**Not a deliverable claim:** certified landing-site safety, guaranteed power, guaranteed DTE communications, or NASA endorsement.

## Primary references

- [Space Apps Challenge 10 page](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)
- [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html); [Horizons API docs](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [LOLA GDRDEM products and metadata](https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/Lunar%20Reconnaissance%20Orbiter%20%28LRO%29/LOLA/GDR/GDRDEM.htm); [Lunar ODE](https://ode.rsl.wustl.edu/moon/); [DOI 10.17189/1520642](https://doi.org/10.17189/1520642)
- [Moon Trek](https://trek.nasa.gov/moon/); [WMTS API](https://trek.nasa.gov/tiles/apidoc/)
- [LROC QuickMap](https://quickmap.lroc.asu.edu/); [LROC terms and citation](https://www.lroc.im-ldi.com/about/terms); [Lunaserv overview](https://lunaserv.im-ldi.com/about.html)
- [NASA GSFC PGDA south polar LOLA maps](https://pgda.gsfc.nasa.gov/products/90)
- [USGS lunar coordinate/projection guide](https://pubs.usgs.gov/tm/11/e1/tm11E1.pdf)
- [NASA media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/)

## Guided build decisions — Step 1 (15 November 2026)

The default comparison is **Nobile Rim 1 (PGDA Site06) versus Nobile Rim 2 (PGDA DM2)**. NASA lists both among its nine candidate Artemis III landing regions (2024 update), and NASA GSFC PGDA hosts 5 m/pixel nominal LOLA DEM products for both regions. PGDA states these GeoTIFFs use south polar stereographic X/Y metres in the MOON_ME / DE421 frame. The 5 m grid spacing must not be represented as 5 m independently measured terrain: the product page says about 90% of 5 m pixels are interpolated. This is a good controlled comparison and dataset-availability choice, not an endorsement of either site or a claim that these remain the only/current operational choices.

**Build sequence:** (1) lock these two regions and inspect actual metadata/coverage; (2) obtain and decode source rasters and record citations; (3) verify sample coordinates and frames; (4) query Horizons for site-relative Sun/Earth; (5) calculate local terrain horizons and visibility windows; (6) build the interactive comparison UI; (7) validate and prepare the demo. No user technical choice is needed unless they later want to change the project goal.

## Guided build decisions — Step 2: terrain-source compatibility check

**Verified from NASA GSFC PGDA product page and its downloadable README:** Site06 (Nobile Rim 1) and DM2 (Nobile Rim 2) each have a `*_surf.tif` surface-height GeoTIFF and companion LOLA count, slope and uncertainty products. The README states both use 5 m/pixel south-polar stereographic X/Y in metres, MOON_ME / JPL DE421 frame, with GMT pixel registration (coordinates refer to pixel centers). File sizes from the server's HEAD responses are 64,025,603 bytes for Site06 and 64,025,607 bytes for DM2. The PGDA description warns that ~90% of 5 m grid cells are interpolated; it reports median RMS height error around 0.30–0.50 m and median RMS slope error around 1.5–2.5° in the studied regions, with illumination sensitivity to height uncertainty.

**Decision:** these two data patches are compatible enough to proceed with a fair first comparison: same provider, nominal grid spacing, projection family, frame and pixel-registration convention. This is not proof that their raster footprints align or have identical grid origin/dimensions.

**Still to inspect from the actual TIFF headers:** width/height, GeoTIFF tie point and pixel scale, nodata, vertical values/units, and each actual footprint. Direct web preview of the TIFF is not supported; a shell download attempt did not complete, so no raster-header values are claimed yet. Before comparing points, we will inspect the headers or GIS-compatible product metadata and choose an actual point inside each file's valid footprint. Source page instructs users to cite Barker et al. (2021), DOI 10.1016/j.pss.2020.105119.

## Guided build decisions — Step 3: define a comparison point and visibility method

**A comparison point is one sampled surface location inside each named region**, not a claim that NASA has picked that exact landing coordinate. Deterministic selection rule for the demo: after reading raster georeferencing, use the center of each valid Site06 / DM2 terrain footprint (if center is nodata, snap to the nearest valid cell); record the pixel index, projected X/Y, converted east longitude/latitude, DEM height, and frame. This neutral rule avoids selecting a point because it gives a favorable score. If the official region geometry becomes available for both regions, use its centroid and the same valid-cell snapping rule instead.

**Terrain scale:** retain the 5 m nominal region DEMs for the immediate skyline and surface context. For longer-distance obstructions, use a broader LOLA context DEM; NASA GSFC PGDA lists the 80–90°S 20 m/pixel LDEM product as a COG in the same south-polar stereographic X/Y and MOON_ME / DE421 frame. Read only a bounded window from that cloud-optimized raster if HTTP byte-range access is available; do not download its multi-gigabyte full file for the hackathon. Blend scales only after aligning frame, origin, pixel registration, vertical units and edge overlap. Regional high-res 5 m surfaces are ~90% interpolated, so keep the LDEC return-count and uncertainty layers visible in QA.

**Ephemeris + horizon method:** at each selected point, request JPL Horizons topocentric observer output for target Sun (10) and Earth (399), lunar observer body (301), explicit site coordinates, timescale and sampling step. Horizons observer azimuth is clockwise from north and elevation is relative to the local zenith plane; its elevation is not terrain-masked. For each azimuth bin, derive terrain horizon angle as the maximum `atan2(terrain elevation − observer elevation, horizontal distance)` along the DEM ray. Terrain-visible Sun center is `Sun elevation > horizon[Sun azimuth]`; sum those intervals over the requested window for approximate sunlight duration. Use Sun angular radius only if partial-disk illumination is implemented; this MVP initially reports center-clear intervals.

For Earth, do not use a single Boolean “communication available” metric. The first version reports **geometric line of sight only**: compare the apparent Earth disk at its Horizons azimuth/elevation to the terrain skyline. If only center directions are available, report center-clear and label it as such; if angular diameter/limb handling is included, distinguish fully visible / partly terrain-blocked / fully blocked. This remains separate from antenna pointing, link budget, relay availability, and radio propagation.

**Known dependency before coordinates or numeric outputs:** GeoTIFF geotransform, nodata, vertical datum/unit, and center-cell valid-data status still need direct header inspection. Do not yet send Horizons queries with inferred or hand-guessed coordinates. The NASA wide-area page documents 20 m/pixel products covering 80–90°S and the matching frame; product assets and actual raster metadata must be checked before use.

## Guided build decisions — Step 4: actual raster headers and first Horizons query

**Direct GeoTIFF header values inspected from NASA PGDA files** (using HTTP Range reads of TIFF header and a single center row; no full raster download):

| Patch | Raster | Model-coordinate sample range (pixel centers) | Center pixel map coordinate | Center DEM height |
|---|---:|---|---|---:|
| Site06 / Nobile Rim 1 | 4000 × 4000, one 32-bit IEEE float band, uncompressed, 5 m spacing; nodata `NaN` | X 74,000–93,995 m; Y 120,000–100,005 m (rows run downward) | X=84,000 m, Y=110,000 m | 5,946.381 m |
| DM2 / Nobile Rim 2 | 4000 × 4000, one 32-bit IEEE float band, uncompressed, 5 m spacing; nodata `NaN` | X 147,000–166,995 m; Y 105,000–85,005 m | X=157,000 m, Y=95,000 m | 1,009.903 m |

GeoTIFF keys show a spherical south-polar stereographic projection with origin latitude −90°, central meridian 0°, central scale 1.0, zero false easting/northing, radius 1,737,400 m, linear units metres. The GeoTIFF marks pixel registration at centers (`node_offset=1`). The two patches are each about 20 × 20 km and are separate footprints. The header alone does not prove every cell is valid; the chosen center cells were directly range-read and are finite. Elevations are meters above the 1,737.4 km lunar reference radius per the NASA Lunar Surface Data Book definition of LDEM.

**Representative sample points, independently cross-checked:**

- Nobile Rim 1 / Site06 center: 85.4381° S, 37.36667° E, DEM height 5.946381 km.
- Nobile Rim 2 / DM2 center: 83.954° S, 58.82206° E, DEM height 1.009903 km.

NASA's Lunar Surface Data Book says these center coordinates were generated from the PGDA DEMs and are accurate to 5–10 m for the original region polygons. The inverse projection of each GeoTIFF center pixel matches those published coordinates. Source: NASA NTRS, *Lunar Surface Data Book*, M2M-30044, effective 2025-03-18, table A2.1-1, pp. 73–75; [NASA NTRS document](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf).

**JPL Horizons API smoke query (2026-11-15 00:00 UT; target directions are apparent, but terrain is not applied):**

| Point | Sun azimuth / elevation | Earth azimuth / elevation |
|---|---|---|
| Site06 / Nobile Rim 1 | 77.225067° / +2.571826° | 320.093009° / −0.056085° |
| DM2 / Nobile Rim 2 | 55.894122° / +4.961096° | 298.730106° / −0.653147° |

Queries used observer type, `CENTER=coord@301`, geodetic coordinates, elevation above the 1,737.4 km reference surface, one-minute step, and quantity 4 (apparent azimuth/elevation). Horizons accepted and echoed the site inputs. Its headers report Moon center pole/equator `MEAN_ME (high precision)` and current ephemeris source DE441; the terrain products identify MOON_ME / DE421. Treat the frame labels as compatible in naming but keep a small cross-version orientation uncertainty for validation. These four values are one-time examples only; they are not illumination durations or DTE windows.

**Corrected terrain-horizon geometry:** do not cast rays on a flat XY plane for long distances. Convert each DEM sample to a 3D point on a lunar sphere of radius 1,737,400 m plus its DEM height, subtract the observer's 3D position, then project the vector into local east/north/up. The terrain skyline is the maximum elevation angle in each azimuth bin. This includes lunar curvature and observer height. Then compare the Horizons Sun/Earth azimuth/elevation with this skyline. A regional 20 km patch is too small to represent all distant ridges; the broad 80–90°S LOLA COG should supply long-range context, but its byte-range window support and cross-resolution seam still need verification.

**Next:** verify range-window reads from the broad DEM and construct a test skyline for each point; compare map-derived coordinates and horizon plot against the NASA Moon Trek / QuickMap view before displaying a sunlight or geometric Earth-visibility result.

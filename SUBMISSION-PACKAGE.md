# Space Apps submission copy

Use these prepared answers in the project page. Adjust the team/author details to match the registered team. Do not paste the local `127.0.0.1` address as a public app link; it only works on your computer.

## Project title

ASTRO — Lunar Landing Site Navigator

## Short description

ASTRO is an offline-first lunar site screening app. It compares seven days of JPL Horizons Sun and Earth directions with LOLA-derived terrain skylines at two lunar south-pole reference sites. A UTC date selector, time-window controls, sky plot, and visibility timeline help users explore when each body centre clears the local terrain. The app shows its data sources and limitations alongside the results.

## Challenge response

The Lunar Landing Site Navigator challenge asks for an intuitive way to compare lunar sites and dates while seeing Sun and Earth positions relative to the horizon. ASTRO makes that geometry explorable: users choose a UTC date and time span, compare Nobile Rim 1 and Nobile Rim 2, inspect each local sky, and scrub the visibility timeline. It turns otherwise technical ephemeris and terrain data into a clear screening view for mission planners, educators, and the public.

## How NASA data is used

The local terrain skylines were calculated from NASA GSFC PGDA LOLA south-pole site elevation models for Site06 / Nobile Rim 1 and DM2 / Nobile Rim 2. The Sun and Earth observer directions come from JPL Horizons for the DEM centre coordinates. Four source tables are bundled with the app so the displayed seven-day series works offline. Every source table is checked against its target ID, observer coordinates, angular columns, lunar orientation label, sample cadence, and matching UTC timestamps before packing.

## Method and validation

For each sample, the app compares the Horizons apparent body-centre elevation to the terrain skyline angle in the same azimuth direction. Terrain rays are computed on a spherical Moon to include curvature. The skyline uses a local 10 km radius, 10 m sampling interval, and 0.25° azimuth bins. Duration values sum sampled 10-minute intervals, so they are estimates at the selected cadence, not exact rise/set times.

For the bundled seven-day window beginning November 15, 2026 00:00 UTC, the current model estimates 132.3 h of Sun-centre terrain visibility and 69.7 h of Earth-centre terrain visibility at Nobile Rim 1, compared with 168.0 h and 168.0 h at Nobile Rim 2. These are 10-minute sampled geometric estimates; they are not a claim that either location is mission-ready or universally preferable.

The original LOLA grid spacing is nominally 5 m, but the product notes that about 90% of the nominal 5 m cells are interpolated. The LOLA products use MOON_ME / DE421; the Horizons tables use MEAN_ME high precision / DE441. Their cross-solution orientation residual has not been quantified. Results are screening estimates, not operational mission guidance.

## Impact and next use

Sun access and Earth line of sight are important early considerations for lunar surface operations. ASTRO helps users compare those two geometric factors at traceable candidate points and exposes the assumptions that a planner would need to review before using a result. A future mission-planning version should add broader terrain coverage, the full Earth disk, antenna and relay constraints, link budgets, solar-array orientation, and uncertainty analysis.

## Limitations

The Sun metric is terrain visibility of the Sun’s centre, not power generation. The Earth metric is visibility of Earth’s centre, not proof of a direct-to-Earth communications link. The app does not model the full Earth disk, antenna pointing, RF link budget, relays, solar-array orientation, distant terrain outside the DEM patch, landing hazards, or certification. The two-site locator is schematic; the numeric coordinates and DEM centres are the analysis references.

## Data and software sources

- NASA GSFC PGDA, High-Resolution LOLA Topography for Lunar South Pole Sites: https://pgda.gsfc.nasa.gov/products/78
- Barker et al. (2021), DOI: https://doi.org/10.1016/j.pss.2020.105119
- NASA Lunar Surface Data Book M2M-30044: https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf
- NASA/JPL Horizons: https://ssd.jpl.nasa.gov/horizons/
- Project source and calculation details: see the included README.md and RESEARCH-AND-SOURCES.md.

## AI assistance disclosure

OpenAI Codex assisted with research organization, source-code generation, and editing. The project team should review the code, science claims, data citations, and final submission before submitting.

## Links to add in the submission form

- Public app link: not yet deployed. Publish the app folder to a hosting service before adding a public app URL, or provide the allowed project media/source links requested by the form.
- Source code: add the team’s public repository or other permitted source-code link.
- Team members: copy the registered members from the NASA Space Apps team page.
- Optional demo or slides: attach the team’s own short walkthrough if the form or local event requests it.

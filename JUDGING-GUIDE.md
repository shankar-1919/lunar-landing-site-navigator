# Demo and judging guide

## A two-minute walkthrough

1. **Start with the decision.** “A landing-site decision needs more than a pretty map. ASTRO compares local terrain with the Sun and Earth directions at two published lunar south-pole reference points.”
2. **Show the map and the two sites.** Explain that the pins are a schematic locator for DEM centre points, not a landing-accuracy map. Point out the published coordinates and elevations.
3. **Show the local-sky panel.** Select each site. The gray curve is a terrain skyline calculated from LOLA elevation samples; the colored markers and tracks show JPL Horizons body directions across the selected UTC window.
4. **Explain the visibility rule.** A body centre counts as geometrically clear only when its elevation exceeds the skyline at its azimuth. The included seven-day bundle supports 24-hour, three-day, and seven-day interval estimates; the displayed time step limits their precision.
5. **End with limitations and next science step.** The result is a screening aid. It does not establish power, landing safety, a complete long-range horizon, or a working direct-to-Earth radio link. The next upgrade is an independently checked multi-epoch bundle and broader terrain coverage.

## Rubric strategy

| Criterion | Show | Evidence and honest boundary |
|---|---|---|
| Impact | Explain why sunlight and Earth visibility affect surface operations and communications planning. | This prototype supports early screening; it does not select or certify a landing site. |
| Creativity | Show the linked local-sky plot, terrain skyline, time scrubber, and two-site comparison. | The interaction turns geometry into an interpretable decision aid; do not claim a novel scientific method. |
| Validity | Open “Trace every result,” show the source pages, coordinates, frame note, and terrain-window limitation. | The LOLA terrain profile and four Horizons source tables are bundled and checked. Duration results are sampled geometric estimates. |
| Relevance | Tie the experience directly to lunar surface mission planning: illumination and line-of-sight screening. | Earth-centre visibility is only a geometric proxy, not a DTE link assessment. |
| Presentation | Follow the walkthrough, keep the app full-screen, use the included seven-day dataset, and state one limitation before the judges ask. | Earth-centre visibility is not a working radio link; Sun-centre visibility is not a power estimate. |

## Suggested project description

**ASTRO — Lunar Landing Site Navigator** is an explainable screening prototype for comparing Sun and Earth line-of-sight geometry at two lunar south-pole reference locations. It overlays a LOLA-derived local skyline with observer directions from JPL Horizons and makes the data window, timestamps, and limitations visible. It does not certify landing safety, solar power, or radio connectivity.

## Before recording or presenting

- Run the app locally and confirm the bundled terrain and seven-day series display.
- Keep the selected date and window within the bundled **2026-11-15 to 2026-11-22 UTC** coverage.
- The four source tables and validated bundle are included. Their headers document observer coordinates, angular quantities, frame/ephemeris, and cadence.
- Capture one screenshot of the two-site overview and one of the local-sky plot with the source dialog open.
- Credit NASA GSFC PGDA/LOLA, JPL Horizons, and the cited research paper. State that the independent project is not endorsed by NASA.

## Known work beyond this MVP

- Reconcile the DEM and Horizons body-fixed frame solutions and quantify orientation uncertainty.
- Expand the skyline beyond the current 10 km sampling radius with validated regional terrain mosaics.
- Add a lunar disk and partial-Earth visibility, then antenna geometry and a reviewed RF link budget for a meaningful DTE assessment.
- Add illumination incidence, array orientation, shadow/power storage, landing hazards, and uncertainty propagation.
- Replace the schematic locator with a georeferenced lunar basemap and let users select exact points that have matching terrain and ephemerides.

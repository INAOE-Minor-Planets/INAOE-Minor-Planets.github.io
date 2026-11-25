# INAOE Minor Planets Group

Website of the Minor Planets Group of the National Institute of Astrophysics, Optics and
Electronics (INAOE), Mexico: published reflectance spectra and taxonomic classes, the hybrid
classification method, and rotational light curves of asteroids.

**Site:** https://inaoe-minor-planets.github.io

> **Status: preview.** Spectra and light-curve files in `data/` are currently *synthetic
> placeholders* generated from the published classes, periods and amplitudes. Every placeholder
> says so in its header and on the site. All tabulated values (classes, probabilities, periods,
> amplitudes, dates, physical parameters) are taken from the publications.

## Structure

```
index.html              Home
spectra/                II · Reflectance spectra (catalogue and one page per asteroid)
classification/         III · Hybrid taxonomic classification (interactive tool in preparation)
lightcurves/            IV · Rotation periods and light curves (Tonantzintla Schmidt Camera)
data/                   All content, as CSV and text files — edit here
  publications.csv
  spectra/catalog.csv, class_means.csv, files/*.txt
  lightcurves/objects.csv, periods.csv, files/*.csv
  classification/performance.csv
assets/                 Page code (JavaScript) and site-specific styles
estilo/                 Shared visual system (also used by the internal observation archive)
```

It is a static site with no build step, served by GitHub Pages. Pages load their data from
`data/` in the browser, so to preview it locally run a web server in the repository folder
(for example `python -m http.server`) instead of opening the files directly.

## Editing

How to add spectra, light curves and publications from the GitHub web interface:
[EDITAR.md](EDITAR.md) (in Spanish).

## Sources

- Buendia E. et al. 2026, *MNRAS*, 545, staf2098 — doi:10.1093/mnras/staf2098 (CC BY 4.0)
- Michimani J. et al. 2026, *Research Notes of the AAS*, 10, 75 (CC BY 4.0)
- Munguía M. Y. et al. 2026, *Minor Planet Bulletin*, 53, 179
- Valdés J. R. et al. 2023, *Revista Mexicana de Astronomía y Astrofísica*, 59, 67 — doi:10.22201/ia.01851101p.2023.59.01.04

Osculating orbital elements are from the JPL Small-Body Database. The class means used for
comparison are computed from the e-SMASS reference set (SMASSII spectra of Bus & Binzel 2002 plus
additional O and Q spectra) distributed with the classification code.

Fonts: IBM Plex Sans, IBM Plex Mono and Source Serif 4, under the SIL Open Font License 1.1.

/* home.js — Home page: overview, module cards, orbital figure, facilities and publications. */
'use strict';

(async function () {
  let espectros, objetosLC, periodos;
  try {
    [espectros, objetosLC, periodos] = await Promise.all([
      cargarCSV('data/spectra/catalog.csv'), cargarCSV('data/lightcurves/objects.csv'), cargarCSV('data/lightcurves/periods.csv'), cargarPublicaciones()]);
  } catch (e) { cabecera(); pie(); return errorCarga(e); }

  const conPeriodo = new Set(periodos.filter(p => p.period_h).map(p => p.id));
  const clases = new Set(espectros.map(o => o.class).filter(Boolean));
  cabecera({ fits: [
    ['NSPECTRA', espectros.length, 'asteroids with reflectance spectra'],
    ['NCLASSES', clases.size, 'taxonomic classes found'],
    ['NROTPER', conPeriodo.size, 'rotation periods measured'],
    ['NPUBS', PUBS.size, 'publications'],
  ] });
  pie();
  const sinteticos = espectros.filter(o => o.spectrum_status === 'synthetic').length + objetosLC.filter(o => o.data_status === 'synthetic').length;
  avisoVistaPrevia(sinteticos, 'spectra and light curves');

  const tarjeta = (href, rotulo, titulo, cifra, unidad, texto, prox) =>
    el(href ? 'a' : 'div', { class: 'tarjeta' + (prox ? ' prox' : ''), href: href ? ruta(href) : null },
      el('span', { class: 'rotulo' }, rotulo), el('h3', {}, titulo),
      el('div', { class: 'cifra' }, cifra, unidad ? el('small', {}, unidad) : null), el('p', {}, texto));

  // Figure 1: every asteroid in the publications, in the a–e plane
  const puntos = [
    ...espectros.filter(o => o.a_au && o.e).map(o => ({ x: +o.a_au, y: +o.e, forma: 'circulo', color: 'var(--cx-s)', r: 3.2,
      datos: { o, modulo: 'spectra', txt: `Spectrum · class ${o.class}` } })),
    ...objetosLC.filter(o => o.a_au && o.e).map(o => ({ x: +o.a_au, y: +o.e, forma: 'cuadro', color: 'var(--cx-c)', r: 3.8,
      datos: { o, modulo: 'lightcurves', txt: 'Light curve' + (conPeriodo.has(o.id) ? '' : ' (no period)') } })),
  ];
  const fig1 = el('figure', { class: 'fig' },
    el('div', { class: 'fig-cab' }, leyenda([['circulo', 'var(--cx-s)', 'Reflectance spectrum', puntos.filter(p => p.datos.modulo === 'spectra').length],
                                              ['cuadro', 'var(--cx-c)', 'Light curve', puntos.filter(p => p.datos.modulo === 'lightcurves').length]])),
    lienzo(dispersion({ puntos, xDom: [0.8, 3.0], yDom: [0, 0.7], alto: 300, descripcion: 'Semimajor axis versus eccentricity of the asteroids in our publications',
      xTitulo: [varSVG('a'), ' (au)'], yTitulo: [varSVG('e')],
      extras: ({ x, y, pw, ph }) => {
        const pts = []; for (let a = 1.3; a <= 3.0001; a += 0.02) pts.push(`${x(a).toFixed(1)},${y(1 - 1.3 / a).toFixed(1)}`);
        return S('g', {}, S('polyline', { class: 'umbral', points: pts.join(' ') }),
          S('text', { x: pw - 2, y: y(1 - 1.3 / 3) - 6, 'text-anchor': 'end', style: 'paint-order:stroke; stroke:var(--surface); stroke-width:3px' }, 'q = 1.3 au'));
      },
      tip: d => [el('strong', {}, nombreObjeto(d.o)), el('span', {}, d.txt)],
      alClic: d => { location.href = ruta(`${d.modulo}/#${encodeURIComponent(d.o.id)}`); } })),
    el('figcaption', {}, el('b', {}, 'Figure 1. '), 'Osculating semimajor axis and eccentricity (JPL Small-Body Database) of the asteroids in our publications. ',
      'Objects below the dashed curve (perihelion q = 1.3 au) are main-belt or Mars-crossing; above it, near-Earth. Click a point to open the object.'));

  const instalaciones = el('dl', { class: 'instalaciones' },
    el('div', {}, el('dt', {}, '2.1-m telescope, Guillermo Haro Astrophysical Observatory (OAGH)'),
      el('dd', {}, 'Cananea, Sonora. Ritchey–Chrétien f/12.5 with a Boller & Chivens spectrograph and a 50 lines mm⁻¹ grating: about 5.3 Å per pixel over 4400–9200 Å. Used for the reflectance spectra.')),
    el('div', {}, el('dt', {}, 'Tonantzintla Schmidt Camera'),
      el('dd', {}, 'Tonantzintla, Puebla. Historic Schmidt camera reactivated for asteroid astrometry and photometry, with an SBIG STF-8300 CCD (28.8′ × 22.0′ field, 0.52″ per pixel). Used for the light curves.')));

  const pubs = [...PUBS.values()].sort((a, b) => b.year - a.year || a.authors.localeCompare(b.authors));
  const seccion = { spectra: 'Spectra', classification: 'Classification', lightcurves: 'Light curves' };
  const tablaPubs = el('div', { class: 'tabla-cont corta' }, el('table', { class: 'pub-tabla' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Year'), el('th', {}, 'Publication'), el('th', {}, 'Journal'), el('th', {}, 'On this site'))),
    el('tbody', {}, pubs.map(p => {
      const url = enlacePub(p);
      return el('tr', {},
        el('td', { class: 'mono' }, p.year),
        el('td', { class: 'titulo-pub' }, url ? el('a', { href: url, rel: 'noopener' }, p.title) : p.title, el('span', { class: 'autores' }, p.authors)),
        el('td', {}, el('i', {}, p.journal), `, ${p.volume}, ${p.pages}`),
        el('td', {}, p.modules.split(';').map(s => s.trim()).filter(Boolean).map((m, i) => [i ? ', ' : '', el('a', { href: ruta(m + '/') }, seccion[m] || m)])));
    }))));

  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('section', { class: 'panel' },
      el('p', { class: 'entrada' }, 'The INAOE Minor Planets Group studies the physical properties of asteroids — their composition, rotation and size — with telescopes operated by the National Institute of Astrophysics, Optics and Electronics in Mexico. This site gathers the results we have published: visible reflectance spectra with their taxonomic classification, and rotational light curves.'),
      el('p', { class: 'entrada' }, 'INAOE is a founding member of the International Asteroid Warning Network (IAWN). Part of our work characterises near-Earth asteroids during their close approaches to Earth.'),
      el('div', { class: 'tarjetas' },
        tarjeta('spectra/', 'II', 'Spectra', espectros.length, 'asteroids', 'Visible reflectance spectra (0.44–0.92 µm) from OAGH, classified in the Bus & Binzel taxonomy.'),
        tarjeta('classification/', 'III', 'Classification', 'In preparation', '', 'Classify your own spectrum in the browser with the hybrid method of Buendia et al. (2026).', true),
        tarjeta('lightcurves/', 'IV', 'Light curves', objetosLC.length, 'asteroids', 'Rotation periods and light-curve amplitudes from the Tonantzintla Schmidt Camera.'))),
    el('div', { class: 'rejilla-2' },
      el('section', { class: 'panel' }, el('h3', {}, 'Asteroids in our publications'), fig1),
      el('section', { class: 'panel' }, el('h3', {}, 'Facilities'), instalaciones)),
    el('section', { class: 'panel', id: 'publications' },
      el('div', { class: 'cab-seccion' }, el('h2', {}, 'Publications'), el('p', { class: 'sub' }, 'Refereed papers and notes whose results appear on this site.')),
      tablaPubs)));
  if (location.hash === '#publications') $('#publications').scrollIntoView();
})();

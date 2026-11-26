/* home.js — Home page: overview, module cards, orbital figures (a–e and a–i), facilities and publications. */
'use strict';

(async function () {
  let espectros, objetosLC, periodos;
  try {
    [espectros, objetosLC, periodos] = await Promise.all([
      cargarCSV('data/spectra/catalog.csv'), cargarCSV('data/lightcurves/objects.csv'), cargarCSV('data/lightcurves/periods.csv'), cargarPublicaciones(), cargarCapasOrbitales()]);
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

  // Figures 1 and 2: every asteroid in the publications, in the a–e and a–i planes
  const objetos = [
    ...espectros.map(o => ({ o, modulo: 'spectra', forma: 'circulo', color: 'var(--cx-s)', r: 3.2, txt: `Spectrum · class ${o.class}` })),
    ...objetosLC.map(o => ({ o, modulo: 'lightcurves', forma: 'cuadro', color: 'var(--cx-c)', r: 3.8, txt: 'Light curve' + (conPeriodo.has(o.id) ? '' : ' (no period)') })),
  ];
  const incl = o => o.i_deg;
  const puntosDe = eje => objetos.filter(d => d.o.a_au && (eje === 'e' ? d.o.e : incl(d.o)))
    .map(d => ({ x: +d.o.a_au, y: +(eje === 'e' ? d.o.e : incl(d.o)), forma: d.forma, color: d.color, r: d.r, datos: d }));
  const puntosE = puntosDe('e'), puntosI = puntosDe('i');
  const cuantos = (m) => new Set([...puntosE, ...puntosI].filter(p => p.datos.modulo === m).map(p => p.datos.o.id)).size;
  const leyendaOrb = el('div', { class: 'fig-cab' }, leyenda([['circulo', 'var(--cx-s)', 'Reflectance spectrum', cuantos('spectra')],
                                                           ['cuadro', 'var(--cx-c)', 'Light curve', cuantos('lightcurves')]]));
  const figura = (eje, puntos, numero, texto) => {
    const fuera = fueraDeMarco(puntos, eje, 'full');
    return el('figure', { class: 'fig' },
      lienzo(figuraOrbital({ eje, puntos, alto: 380, descripcion: `Semimajor axis versus ${eje === 'e' ? 'eccentricity' : 'inclination'} of the asteroids in our publications`,
        tip: d => [el('strong', {}, nombreObjeto(d.o)), el('span', {}, d.txt), el('span', { class: 'mono' }, eje === 'e' ? `a ${d.o.a_au}  e ${d.o.e}` : `a ${d.o.a_au}  i ${incl(d.o)}°`)],
        alClic: d => { location.href = ruta(`${d.modulo}/#${encodeURIComponent(d.o.id)}`); } })),
      el('figcaption', {}, el('b', {}, `Figure ${numero}. `), texto,
        CAPAS_ORB.fondo.length ? ` Small grey dots: a sample of ${CAPAS_ORB.fondo.length.toLocaleString('en')} known asteroids.` : '',
        fuera.length ? ` Not shown: ${fuera.map(p => nombreObjeto(p.datos.o)).join(', ')}.` : '', ' Click a point to open the object.'));
  };
  const figsOrb = el('div', { class: 'figs-orbitales' },
    figura('e', puntosE, 1, 'Osculating semimajor axis and eccentricity (JPL Small-Body Database) of the asteroids in our publications. Grey lines: perihelion distance q = 1.017, 1.3 and 1.67 au, aphelion distance Q = 0.983 au and a = 1 au, which separate Atiras, Atens, Apollos, Amors, Mars-crossers (MCs) and the main belt.'),
    figura('i', puntosI, 2, ['Osculating semimajor axis and inclination (JPL Small-Body Database) of the same asteroids. Dashed grey lines: 5:1, 4:1 and 3:1 mean-motion resonances with Jupiter; dashed black curves: ',
      el('var', {}, 'ν'), el('sub', {}, '6'), ' and ', el('var', {}, 'ν'), el('sub', {}, '16'), ' secular resonances.']));

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
      el('div', { class: 'intro-cols' },
        el('p', { class: 'entrada' }, 'The INAOE Minor Planets Group studies the physical properties of asteroids, composition, rotation and size, with telescopes operated by the National Institute of Astrophysics, Optics and Electronics in Mexico. This site gathers the results we have published.'),
        el('p', { class: 'entrada' }, 'They include visible reflectance spectra with their taxonomic classification, and rotational light curves. INAOE is a founding member of the International Asteroid Warning Network (IAWN), and part of our work characterises near-Earth asteroids during their close approaches to Earth.')),
      el('div', { class: 'tarjetas' },
        tarjeta('spectra/', 'II', 'Spectra', espectros.length, 'asteroids', 'Visible reflectance spectra (0.44–0.92 µm) from OAGH, classified in the Bus & Binzel taxonomy.'),
        tarjeta('classification/', 'III', 'Classification', 'In preparation', '', 'Classify your own spectrum in the browser with the hybrid method of Buendia et al. (2026).', true),
        tarjeta('lightcurves/', 'IV', 'Light curves', objetosLC.length, 'asteroids', 'Rotation periods and light-curve amplitudes from the Tonantzintla Schmidt Camera.'))),
    el('section', { class: 'panel' }, el('h3', {}, 'Asteroids in our publications'), leyendaOrb, figsOrb),
    el('section', { class: 'panel' }, el('h3', {}, 'Facilities'), instalaciones),
    el('section', { class: 'panel', id: 'publications' },
      el('div', { class: 'cab-seccion' }, el('h2', {}, 'Publications'), el('p', { class: 'sub' }, 'Refereed papers and notes whose results appear on this site.')),
      tablaPubs)));
  if (location.hash === '#publications') $('#publications').scrollIntoView();
})();

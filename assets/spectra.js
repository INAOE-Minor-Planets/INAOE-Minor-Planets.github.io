/* spectra.js — Module II: catalogue of published reflectance spectra and one view per object.
   Reads data/spectra/catalog.csv, data/spectra/class_means.csv and data/spectra/files/*.txt. */
'use strict';

let CAT = [], MEDIAS = null, CUENTAS = new Map();
const filtros = { texto: '', complejo: '', poblacion: '', pub: '', clase: '' };
let ejeOrbita = 'i', vistaOrbita = 'full';

(async function () {
  cabecera({ activo: 'spectra' }); pie();
  try {
    const [cat, medias, cuentas] = await Promise.all([cargarCSV('data/spectra/catalog.csv'), cargarCSV('data/spectra/class_means.csv'),
      cargarCSV('data/spectra/class_means_counts.csv'), cargarPublicaciones(), cargarCapasOrbitales()]);
    CAT = cat; MEDIAS = medias; CUENTAS = new Map(cuentas.map(c => [c.class, +c.n_spectra]));
  } catch (e) { return errorCarga(e); }
  avisoVistaPrevia(CAT.filter(o => o.spectrum_status === 'synthetic').length, 'spectra');
  addEventListener('hashchange', mostrar);
  mostrar();
})();

function mostrar() {
  ocultarTip();
  const id = decodeURIComponent(location.hash.slice(1));
  const o = CAT.find(x => x.id === id);
  if (o) vistaObjeto(o); else vistaCatalogo();
  window.scrollTo({ top: 0 });
}

/* ---------------- Catalogue ---------------- */
function filtrar() {
  const t = filtros.texto.toLowerCase().replace(/[\s()]/g, '');
  return CAT.filter(o => (!t || `${o.number}${o.name}`.toLowerCase().replace(/[\s()]/g, '').includes(t))
    && (!filtros.complejo || complejoDe(o.class).id === filtros.complejo)
    && (!filtros.poblacion || o.population.startsWith(filtros.poblacion))
    && (!filtros.pub || o.publication === filtros.pub)
    && (!filtros.clase || o.class === filtros.clase));
}

function vistaCatalogo() {
  const cuenta = el('span', { class: 'cuenta-res' });
  const contFig1 = el('div'), contFig2 = el('div'), contTabla = el('div'), chipClase = el('span');
  const selector = (id, etiqueta, opciones, clave) => el('div', { class: 'campo' }, el('label', { for: id }, etiqueta),
    el('select', { id, onchange: e => { filtros[clave] = e.target.value; repintar(); } },
      opciones.map(([v, t]) => el('option', { value: v, selected: filtros[clave] === v ? true : null }, t))));
  const pubs = [...new Set(CAT.map(o => o.publication))];
  const barra = el('div', { class: 'filtros-fila' },
    el('div', { class: 'campo' }, el('label', { for: 'f-texto' }, 'Asteroid'),
      el('input', { id: 'f-texto', type: 'search', placeholder: 'Number or name', value: filtros.texto, oninput: e => { filtros.texto = e.target.value; repintar(); } })),
    selector('f-cx', 'Taxonomic complex', [['', 'All'], ...COMPLEJOS.filter(c => CAT.some(o => complejoDe(o.class).id === c.id)).map(c => [c.id, c.nombre])], 'complejo'),
    selector('f-pob', 'Population', [['', 'All'], ['flora_member', 'Flora family members'], ['flora_background', 'Flora neighbourhood, background'], ['nea', 'Near-Earth asteroids']], 'poblacion'),
    selector('f-pub', 'Publication', [['', 'All'], ...pubs.map(p => [p, PUBS.get(p) ? `${autoresCortos(PUBS.get(p))} ${PUBS.get(p).year}` : p])], 'pub'),
    chipClase, cuenta);

  function repintar() {
    const filas = filtrar();
    cuenta.textContent = `${filas.length} of ${CAT.length} asteroids`;
    chipClase.replaceChildren(filtros.clase ? el('button', { class: 'chip', 'aria-pressed': 'true', title: 'Remove class filter',
      onclick: () => { filtros.clase = ''; repintar(); } }, `Class ${filtros.clase} ×`) : '');
    contFig1.replaceChildren(figComposicion(filas, repintar));
    contFig2.replaceChildren(figOrbitas(filas));
    contTabla.replaceChildren(tablaOrdenable(filas, [
      { k: 'number', t: 'Asteroid', v: o => o.number ? +o.number : 1e9, f: o => el('a', { href: '#' + encodeURIComponent(o.id) }, nombreObjeto(o)) },
      { k: 'class', t: 'Class', f: o => el('span', {}, iconoForma(complejoDe(o.class).forma, complejoDe(o.class).color), el('b', {}, o.class)) },
      { k: 'complex', t: 'Complex', v: o => complejoDe(o.class).nombre, f: o => complejoDe(o.class).nombre },
      { k: 'previous_class', t: 'Previous' },
      { k: 'date_ut', t: 'Observed (UT)', mono: true },
      { k: 'v_mag', t: mv('V', 'mag'), num: true, f: o => tal(o.v_mag) },
      { k: 'pv', t: [el('var', {}, 'p'), el('sub', {}, 'V')], num: true, f: o => tal(o.pv) },
      { k: 'd_km', t: mv('D', 'km'), num: true, f: o => vacio(o.d_km) ? '—' : tal(o.d_km) + (o.d_estimated ? '*' : '') },
      { k: 'population', t: 'Population', f: o => ({ flora_member: 'Flora member', flora_background: 'Background', nea_aten: 'NEA · Aten', nea_apollo: 'NEA · Apollo' })[o.population] || o.population },
      { k: 'publication', t: 'Publication', f: o => citaCorta(o.publication) },
    ], { onFila: o => { location.hash = encodeURIComponent(o.id); }, orden: 'number', dir: 1 }));
  }

  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h2', {}, 'Reflectance spectra'),
        el('p', { class: 'sub' }, `${CAT.length} asteroids · 0.44–0.92 µm · Bus & Binzel (2002) taxonomy`)),
      el('p', { class: 'entrada' }, 'Visible spectra obtained with the Boller & Chivens spectrograph on the 2.1-m telescope of the Guillermo Haro Astrophysical Observatory. Each asteroid spectrum is divided by that of a solar analogue observed right after it and normalized to 1 at 0.55 µm. Classes come from the hybrid method of Buendia et al. (2026): a spectral distance with a weight function, checked with three k-nearest-neighbour classifiers.'),
      el('div', { style: 'margin-top:16px' }, barra),
      el('div', { class: 'rejilla-2 figs-catalogo' }, contFig1, contFig2)),
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h3', {}, 'Catalogue'),
        el('p', { class: 'sub' }, 'Click a row to see the spectrum. * Diameter estimated from the mean albedo of the taxonomic type.'),
        el('a', { class: 'der', href: ruta('data/spectra/catalog.csv'), download: 'inaoe_spectra_catalog.csv' }, 'Download catalogue (CSV)')),
      contTabla)));
  repintar();
}

/* Figure: number of asteroids per class, grouped by complex */
function figComposicion(filas, repintar) {
  const conteo = new Map(); for (const o of filas) conteo.set(o.class, (conteo.get(o.class) || 0) + 1);
  const clases = COMPLEJOS.flatMap(c => c.clases.filter(k => conteo.has(k)).map(k => ({ k, c })));
  for (const k of conteo.keys()) if (!clases.some(x => x.k === k)) clases.push({ k, c: complejoDe(k) });
  const max = Math.max(1, ...conteo.values());
  const dibujar = w => {
    const fila = 19, M = { l: 44, r: 34, t: 4, b: 26 }, H = M.t + M.b + Math.max(1, clases.length) * fila;
    const pw = w - M.l - M.r, x = escala(0, max, 0, pw);
    const g = S('g', { transform: `translate(${M.l},${M.t})` });
    const paso = pasoBonito(max, 4);
    g.append(S('g', { class: 'grid' }, marcas(paso, max, paso).map(t => S('line', { x1: x(t), x2: x(t), y1: 0, y2: clases.length * fila }))));
    g.append(S('g', {}, marcas(0, max, paso).map(t => S('text', { x: x(t), y: clases.length * fila + 15, 'text-anchor': 'middle' }, String(t)))));
    clases.forEach(({ k, c }, i) => {
      const n = conteo.get(k), y0 = i * fila, bw = Math.max(1.5, x(n)), alto = 12, r = Math.min(3, alto / 2);
      const grupo = S('g', { class: 'col-barra', style: 'cursor:pointer', onclick: () => { filtros.clase = filtros.clase === k ? '' : k; repintar(); },
        onpointermove: e => mostrarTip(e.clientX, e.clientY, el('strong', {}, `${n} asteroid${n === 1 ? '' : 's'}`), el('span', {}, `Class ${k} · ${c.nombre}`), el('span', {}, 'Click to filter the table')),
        onpointerleave: ocultarTip });
      grupo.append(S('rect', { x: -M.l, y: y0, width: pw + M.l + M.r, height: fila, fill: 'transparent' }));
      grupo.append(S('path', { class: 'barra-cx', style: `fill:${c.color}; opacity:${filtros.clase && filtros.clase !== k ? .35 : 1}`,
        d: `M0,${y0 + 3.5}H${bw - r}Q${bw},${y0 + 3.5} ${bw},${y0 + 3.5 + r}V${y0 + 3.5 + alto - r}Q${bw},${y0 + 3.5 + alto} ${bw - r},${y0 + 3.5 + alto}H0Z` }));
      grupo.append(S('text', { x: -8, y: y0 + 13.5, 'text-anchor': 'end', style: 'fill:var(--ink); font-size:11.5px' }, k));
      grupo.append(S('text', { class: 'etiqueta-valor', x: bw + 5, y: y0 + 13.5 }, String(n)));
      g.append(grupo);
    });
    g.append(S('line', { class: 'eje', x1: 0, x2: 0, y1: 0, y2: clases.length * fila }));
    return S('svg', { class: 'viz', width: w, height: H, role: 'img', 'aria-label': 'Number of asteroids per taxonomic class' }, g);
  };
  const presentes = COMPLEJOS.filter(c => filas.some(o => complejoDe(o.class).id === c.id));
  return el('figure', { class: 'fig' },
    el('div', { class: 'fig-cab' }, leyenda(presentes.map(c => [c.forma, c.color, c.nombre, filas.filter(o => complejoDe(o.class).id === c.id).length]))),
    filas.length ? lienzo(dibujar) : el('p', { class: 'vacio' }, 'No asteroids match these filters.'),
    el('figcaption', {}, el('b', {}, 'Figure 1. '), 'Asteroids per taxonomic class. Click a bar to filter the catalogue by that class.'));
}

/* Figure: orbital elements (a–i or a–e), full frame as in the group's plots or zoomed on the objects */
function figOrbitas(filas) {
  const yk = ejeOrbita === 'i' ? 'i_deg' : 'e';
  const conElementos = filas.filter(o => o.a_au && o[yk]);
  const zoomables = conElementos.filter(o => !o.population.startsWith('nea'));          // zoom frames the main-belt objects
  const aPunto = o => { const c = complejoDe(o.class); return { x: +o.a_au, y: +o[yk], forma: c.forma, color: c.color, r: 3.6, datos: o }; };
  const puntos = (vistaOrbita === 'zoom' ? zoomables : conElementos).map(aPunto);
  const fuera = [...fueraDeMarco(puntos, ejeOrbita, vistaOrbita).map(p => p.datos), ...(vistaOrbita === 'zoom' ? conElementos.filter(o => !zoomables.includes(o)) : []),
                 ...filas.filter(o => !conElementos.includes(o))];
  const lz = lienzo(figuraOrbital({ eje: ejeOrbita, vista: vistaOrbita, puntos, alto: 380, descripcion: `Semimajor axis versus ${ejeOrbita === 'i' ? 'inclination' : 'eccentricity'} of the observed asteroids`,
    tip: o => [el('strong', {}, nombreObjeto(o)), el('span', {}, `Class ${o.class} · ${complejoDe(o.class).nombre}`),
      el('span', { class: 'mono' }, `a ${tal(o.a_au)}  e ${tal(o.e)}  i ${tal(o.i_deg)}°`)],
    alClic: o => { location.hash = encodeURIComponent(o.id); } }));
  const rehacer = () => lz.parentElement.parentElement.replaceWith(figOrbitas(filas));
  const grupo = (etiqueta, opciones, actual, fijar) => el('div', { class: 'alternar', role: 'group', 'aria-label': etiqueta },
    opciones.map(([k, ...t]) => el('button', { type: 'button', 'aria-pressed': actual === k ? 'true' : 'false', onclick: () => { fijar(k); rehacer(); } }, t)));
  const texto = ejeOrbita === 'i'
    ? ['Dashed grey lines: 5:1, 4:1 and 3:1 mean-motion resonances with Jupiter; dashed black curves: ', el('var', {}, 'ν'), el('sub', {}, '6'), ' and ', el('var', {}, 'ν'), el('sub', {}, '16'), ' secular resonances.']
    : 'Grey lines: perihelion distance q = 1.017, 1.3 and 1.67 au, aphelion distance Q = 0.983 au and a = 1 au, which separate Atiras, Atens, Apollos, Amors, Mars-crossers (MCs) and the main belt.';
  return el('figure', { class: 'fig' },
    el('div', { class: 'fig-cab' }, el('span', { class: 'sub' }, `${puntos.length - fueraDeMarco(puntos, ejeOrbita, vistaOrbita).length} asteroids shown`),
      el('div', { style: 'margin-left:auto; display:flex; gap:8px; flex-wrap:wrap' },
        grupo('Vertical axis', [['i', 'a – ', el('var', {}, 'i')], ['e', 'a – ', el('var', {}, 'e')]], ejeOrbita, k => { ejeOrbita = k; }),
        grupo('Extent', [['full', 'Full'], ['zoom', 'Zoom']], vistaOrbita, k => { vistaOrbita = k; }))),
    el('div', {}, lz),
    el('figcaption', {}, el('b', {}, 'Figure 2. '), 'Osculating orbital elements (JPL Small-Body Database) of the asteroids in the selection, by taxonomic complex. ', texto,
      CAPAS_ORB.fondo.length ? ' Small grey dots: a sample of known asteroids.' : '', ' Click a point to open its spectrum.',
      fuera.length ? ` Not shown: ${fuera.map(nombreObjeto).join(', ')}.` : ''));
}

/* ---------------- Object view ---------------- */
async function vistaObjeto(o) {
  const c = complejoDe(o.class);
  const dato = (t, v) => el('div', {}, el('dt', {}, t), el('dd', {}, v));
  const metodos = [['Weight function (cumulative)', o.cwf_label, o.cwf_value], ['k-NN', o.knn_label, o.knn_prob],
                   ['k-NN with PCA', o.pca_label, o.pca_prob], ['k-NN with NCA', o.nca_label, o.nca_prob]];
  const contFig = el('div', {}, el('p', { class: 'sub' }, 'Loading spectrum…'));
  const sintetico = o.spectrum_status === 'synthetic';
  const tags = [
    el('span', { class: 'etq cx' }, iconoForma(c.forma, c.color), `Class ${o.class}`),
    el('span', { class: 'etq' }, c.nombre),
    el('span', { class: 'etq' }, POBLACION[o.population] || o.population),
    o.smass_control ? el('span', { class: 'etq ok', title: 'Control object from the Small Main-Belt Asteroid Spectroscopic Survey' }, `${o.smass_control} control`) : null,
    sintetico ? el('span', { class: 'etq sint', title: 'The plotted spectrum is a placeholder, not the observed spectrum' }, 'Synthetic spectrum') : null,
  ];
  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('div', { class: 'volver' }, el('a', { href: '#' }, '← All spectra')),
    el('section', { class: 'panel' },
      el('div', { class: 'ficha-cab' }, el('h2', {}, nombreObjeto(o)), el('span', { class: 'id' }, `observed ${o.date_ut} UT`), el('div', { class: 'etiquetas' }, tags)),
      el('div', { class: 'ficha-cuerpo' },
        el('div', {},
          el('dl', { class: 'datos' },
            dato(mv('H', 'mag'), tal(o.h_mag)), dato([el('var', {}, 'p'), el('sub', {}, 'V')], tal(o.pv)),
            dato(mv('D', 'km'), vacio(o.d_km) ? '—' : tal(o.d_km) + (o.d_estimated ? '*' : '')), dato(mv('V', 'mag'), tal(o.v_mag)),
            dato([el('var', {}, 'α'), ' (°)'], tal(o.phase_deg)), dato(mv('a', 'au'), tal(o.a_au)), dato(mv('e'), tal(o.e)), dato(mv('i', '°'), tal(o.i_deg))),
          el('p', { class: 'resumen-obs' }, `Exposures: ${o.exposure} s. Solar analogue: ${o.solar_analogue || '—'}.`,
            o.d_estimated ? el('span', { class: 'alias' }, '* Diameter estimated from the mean albedo of the taxonomic type.') : null),
          el('h3', { style: 'margin-top:20px' }, 'Classification'),
          el('div', { class: 'tabla-simple' }, el('table', { class: 'simple tabla-metodos' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Method'), el('th', {}, 'Type'), el('th', { class: 'num' }, 'Score'))),
            el('tbody', {}, metodos.map(([m, l, v]) => el('tr', {}, el('td', {}, m), el('td', {}, l || '—'), el('td', { class: 'num' }, vacio(v) ? '—' : num(v, 3)))),
              el('tr', {}, el('td', {}, el('b', {}, 'Proposed class')), el('td', {}, el('b', {}, o.class)), el('td', {})),
              el('tr', {}, el('td', {}, 'Previously published class'), el('td', {}, o.previous_class || 'none'), el('td', {}))))),
          el('p', { class: 'sub', style: 'margin-top:8px' }, 'Scores: cumulative weight function of the spectral distance (k = 10) and k-NN probabilities, with labels S, C, X, PS (positive slope) and NS (negative slope).')),
        contFig)),
    el('section', { class: 'panel' },
      o.notes ? [el('h3', {}, 'Notes'), el('p', { class: 'entrada', style: 'font-size:14px' }, o.notes)] : null,
      el('h3', { style: o.notes ? 'margin-top:16px' : null }, 'Reference'), citaCompleta(o.publication),
      el('details', { style: 'margin-top:8px' }, el('summary', { style: 'cursor:pointer; color:var(--accent); font-size:13px' }, 'BibTeX'), el('pre', { class: 'bibtex' }, bibtex(o.publication))))));

  let datos;
  try { datos = leerEspectro(await cargarTexto(`data/spectra/files/${o.spectrum_file}`)); }
  catch (e) { contFig.replaceChildren(el('p', { class: 'vacio' }, `Spectrum file not found: data/spectra/files/${o.spectrum_file}`)); return; }
  contFig.replaceChildren(figEspectro(o, datos));
}

function leerEspectro(texto) {
  return texto.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => l.trim().split(/[\s,;]+/).map(Number)).filter(p => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]))
    .map(([l, r]) => [l > 100 ? l / 1e4 : l, r]);        // accepts Å or µm
}

function figEspectro(o, datos) {
  let claseMedia = CUENTAS.has(o.class) ? o.class : '', verMedia = !!claseMedia;
  const media = () => claseMedia ? MEDIAS.map(f => [+f.wavelength_um, +f[claseMedia]]) : [];
  const sintetico = o.spectrum_status === 'synthetic';
  const dibujar = w => {
    const M = { l: 46, r: 12, t: 16, b: 40 }, H = 320;
    const pw = w - M.l - M.r, ph = H - M.t - M.b;
    const todos = datos.concat(verMedia ? media() : []);
    const ys = todos.map(p => p[1]);
    const yDom = [Math.floor((Math.min(...ys) - .03) * 20) / 20, Math.ceil((Math.max(...ys) + .03) * 20) / 20];
    const xDom = [0.43, 0.93];
    const x = escala(...xDom, 0, pw), y = escala(...yDom, ph, 0);
    const g = S('g', { transform: `translate(${M.l},${M.t})` });
    const py = pasoBonito(yDom[1] - yDom[0], 5);
    g.append(S('g', { class: 'grid' }, marcas(0.45, 0.9, 0.05).map(t => S('line', { x1: x(t), x2: x(t), y1: 0, y2: ph })),
      marcas(yDom[0], yDom[1], py).map(t => S('line', { x1: 0, x2: pw, y1: y(t), y2: y(t) }))));
    g.append(S('g', {}, marcas(0.45, 0.9, 0.05).map(t => S('text', { x: x(t), y: ph + 15, 'text-anchor': 'middle' }, t.toFixed(2)))));
    g.append(S('g', {}, marcas(yDom[0], yDom[1], py).map(t => S('text', { x: -7, y: y(t) + 3.5, 'text-anchor': 'end' }, t.toFixed(decimales(py))))));
    g.append(S('line', { class: 'eje', x1: 0, x2: pw, y1: ph, y2: ph }), S('line', { class: 'eje', x1: 0, x2: 0, y1: 0, y2: ph }));
    g.append(tituloEje('Wavelength (µm)', { x: pw / 2, y: ph + 32, 'text-anchor': 'middle' }));
    g.append(tituloEje('Reflectance', { x: -M.l + 2, y: -5, 'text-anchor': 'start' }));
    const linea = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
    if (verMedia) g.append(S('path', { class: 'linea-media', d: linea(media()) }));
    g.append(S('path', { class: 'linea-obj', d: linea(datos) }));
    const cruz = S('line', { class: 'cruz', y1: 0, y2: ph, visibility: 'hidden' });
    g.append(cruz);
    const svg = S('svg', { class: 'viz', width: w, height: H, role: 'img', 'aria-label': `Reflectance spectrum of ${nombreObjeto(o)}` }, g);
    g.append(S('rect', { x: 0, y: 0, width: pw, height: ph, fill: 'transparent',
      onpointermove: e => {
        const r = svg.getBoundingClientRect(), lam = xDom[0] + (e.clientX - r.left - M.l) / pw * (xDom[1] - xDom[0]);
        const cerca = datos.reduce((a, b) => Math.abs(b[0] - lam) < Math.abs(a[0] - lam) ? b : a);
        cruz.setAttribute('x1', x(cerca[0])); cruz.setAttribute('x2', x(cerca[0])); cruz.setAttribute('visibility', 'visible');
        const m = verMedia ? media().reduce((a, b) => Math.abs(b[0] - cerca[0]) < Math.abs(a[0] - cerca[0]) ? b : a) : null;
        mostrarTip(e.clientX, e.clientY, el('strong', {}, `R = ${cerca[1].toFixed(3)}`), el('span', { class: 'mono' }, `λ = ${cerca[0].toFixed(3)} µm`),
          m ? el('span', {}, `Mean class ${claseMedia}: ${m[1].toFixed(3)} at ${m[0].toFixed(2)} µm`) : null);
      },
      onpointerleave: () => { cruz.setAttribute('visibility', 'hidden'); ocultarTip(); } }));
    return svg;
  };
  const lz = lienzo(dibujar);
  const clases = MEDIAS.length ? Object.keys(MEDIAS[0]).filter(k => k !== 'wavelength_um') : [];
  const textoLeyenda = () => leyendaLinea(verMedia ? claseMedia : '');
  const contLeyenda = el('div', {}, textoLeyenda());
  const opciones = el('div', { class: 'opciones-fig' },
    el('label', {}, el('input', { type: 'checkbox', checked: verMedia ? true : null, onchange: e => { verMedia = e.target.checked; lz.redibujar(); contLeyenda.replaceChildren(textoLeyenda()); } }), 'Compare with the mean of class'),
    el('select', { 'aria-label': 'Class to compare', onchange: e => { claseMedia = e.target.value; verMedia = true; opciones.querySelector('input').checked = true; lz.redibujar(); contLeyenda.replaceChildren(textoLeyenda()); } },
      clases.map(k => el('option', { value: k, selected: k === claseMedia ? true : null }, `${k} (${CUENTAS.get(k) || '?'} spectra)`))));
  return el('figure', { class: 'fig' },
    el('div', { class: 'fig-cab' }, contLeyenda), lz, el('div', { style: 'margin-top:8px' }, opciones),
    el('figcaption', {}, el('b', {}, 'Figure. '), `Reflectance spectrum of ${nombreObjeto(o)}, normalized to 1 at 0.55 µm. `,
      'Class means are computed from the e-SMASS reference set (SMASSII spectra of Bus & Binzel 2002 plus additional O and Q spectra) used by the classifier.',
      sintetico ? el('span', { style: 'display:block; margin-top:6px; color:var(--warn)' }, 'This spectrum is a synthetic placeholder generated from its published class; it is not the observed spectrum.') : null),
    el('div', { class: 'descargas' }, el('a', { href: ruta(`data/spectra/files/${o.spectrum_file}`), download: o.spectrum_file }, `Download spectrum (${o.spectrum_file})`)));
}
const leyendaLinea = claseMedia => el('div', { class: 'leyenda' },
  el('span', {}, S('svg', { width: 20, height: 8, 'aria-hidden': 'true' }, S('line', { x1: 0, x2: 20, y1: 4, y2: 4, style: 'stroke:var(--accent); stroke-width:2' })), 'This asteroid'),
  claseMedia ? el('span', {}, S('svg', { width: 20, height: 8, 'aria-hidden': 'true' }, S('line', { x1: 0, x2: 20, y1: 4, y2: 4, style: 'stroke:var(--muted); stroke-width:2; stroke-dasharray:6 4' })), `Mean of class ${claseMedia}`) : null);

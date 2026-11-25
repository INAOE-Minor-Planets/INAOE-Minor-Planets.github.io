/* lightcurves.js — Module IV: rotation periods and light curves from the Tonantzintla Schmidt Camera.
   Reads data/lightcurves/objects.csv, data/lightcurves/periods.csv and data/lightcurves/files/*.csv. */
'use strict';

let OBJS = [], PERIODOS = [];
const filtrosLC = { texto: '', poblacion: '', pub: '' };
const GRUPO = o => o.population.startsWith('MBA') ? 'mb' : 'ne';
const GRUPOS = { mb: { nombre: 'Main belt', forma: 'circulo', color: 'var(--lc-mb)' }, ne: { nombre: 'Near-Earth and Mars-crossers', forma: 'cuadro', color: 'var(--lc-ne)' } };
const primera = id => PERIODOS.find(p => p.id === id && p.period_h) || null;

(async function () {
  cabecera({ activo: 'lightcurves' }); pie();
  try {
    [OBJS, PERIODOS] = await Promise.all([cargarCSV('data/lightcurves/objects.csv'), cargarCSV('data/lightcurves/periods.csv'), cargarPublicaciones()]);
  } catch (e) { return errorCarga(e); }
  avisoVistaPrevia(OBJS.filter(o => o.data_status === 'synthetic').length, 'light curves');
  addEventListener('hashchange', mostrarLC);
  mostrarLC();
})();

function mostrarLC() {
  ocultarTip();
  const id = decodeURIComponent(location.hash.slice(1));
  const o = OBJS.find(x => x.id === id);
  if (o) vistaObjetoLC(o); else vistaCatalogoLC();
  window.scrollTo({ top: 0 });
}

function vistaCatalogoLC() {
  const cuenta = el('span', { class: 'cuenta-res' }), contFig = el('div'), contTabla = el('div');
  const pubs = [...new Set(OBJS.map(o => o.publication))];
  const selector = (id, etiqueta, opciones, clave) => el('div', { class: 'campo' }, el('label', { for: id }, etiqueta),
    el('select', { id, onchange: e => { filtrosLC[clave] = e.target.value; repintar(); } },
      opciones.map(([v, t]) => el('option', { value: v, selected: filtrosLC[clave] === v ? true : null }, t))));
  const barra = el('div', { class: 'filtros-fila' },
    el('div', { class: 'campo' }, el('label', { for: 'f-texto' }, 'Asteroid'),
      el('input', { id: 'f-texto', type: 'search', placeholder: 'Number or name', value: filtrosLC.texto, oninput: e => { filtrosLC.texto = e.target.value; repintar(); } })),
    selector('f-pob', 'Population', [['', 'All'], ['mb', 'Main belt'], ['ne', 'Near-Earth and Mars-crossers']], 'poblacion'),
    selector('f-pub', 'Publication', [['', 'All'], ...pubs.map(p => [p, PUBS.get(p) ? `${autoresCortos(PUBS.get(p))} ${PUBS.get(p).year}` : p])], 'pub'),
    cuenta);

  function repintar() {
    const t = filtrosLC.texto.toLowerCase().replace(/[\s()]/g, '');
    const filas = OBJS.filter(o => (!t || `${o.number}${o.name}`.toLowerCase().replace(/[\s()]/g, '').includes(t))
      && (!filtrosLC.poblacion || GRUPO(o) === filtrosLC.poblacion) && (!filtrosLC.pub || o.publication === filtrosLC.pub));
    cuenta.textContent = `${filas.length} of ${OBJS.length} asteroids`;
    contFig.replaceChildren(figPeriodoAmplitud(filas));
    contTabla.replaceChildren(tablaOrdenable(filas, [
      { k: 'number', t: 'Asteroid', v: o => +o.number || 1e9, f: o => el('a', { href: '#' + encodeURIComponent(o.id) }, nombreObjeto(o)) },
      { k: 'population', t: 'Population' },
      { k: 'family', t: 'Family' },
      { k: 'taxonomy', t: 'Taxonomy' },
      { k: 'period', t: mv('P', 'h'), num: true, v: o => primera(o.id)?.period_h, f: o => primera(o.id) ? tal(primera(o.id).period_h) : 'not determined' },
      { k: 'err', t: '±', num: true, v: o => primera(o.id)?.period_err_h, f: o => tal(primera(o.id)?.period_err_h) },
      { k: 'amp', t: mv('A', 'mag'), num: true, v: o => primera(o.id)?.amplitude_mag, f: o => tal(primera(o.id)?.amplitude_mag) },
      { k: 'lcdb', t: 'LCDB period (h)', num: true, v: o => primera(o.id)?.lcdb_period_h, f: o => tal(primera(o.id)?.lcdb_period_h) },
      { k: 'observing_dates', t: 'First night (UT)', mono: true, v: o => (o.observing_dates.match(/\d{4}-\d\d-\d\d/) || [''])[0], f: o => (o.observing_dates.match(/\d{4}-\d\d-\d\d/) || ['—'])[0] },
      { k: 'publication', t: 'Publication', f: o => citaCorta(o.publication) },
    ], { onFila: o => { location.hash = encodeURIComponent(o.id); }, orden: 'number' }));
  }

  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h2', {}, 'Rotational light curves'),
        el('p', { class: 'sub' }, `${OBJS.length} asteroids · Tonantzintla Schmidt Camera · R and clear filters`)),
      el('p', { class: 'entrada' }, 'Differential photometry of main-belt, Mars-crossing and near-Earth asteroids obtained with the Tonantzintla Schmidt Camera. Rotation periods and peak-to-peak amplitudes come from Fourier fits to the composite light curves, as published. Some asteroids were observed in more than one run; each run gives its own determination.'),
      el('div', { style: 'margin-top:16px' }, barra), contFig),
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h3', {}, 'Results'),
        el('p', { class: 'sub' }, 'First determination per asteroid; click a row for every run and the light curve. LCDB: Asteroid Lightcurve Database value quoted in the paper.'),
        el('a', { class: 'der', href: ruta('data/lightcurves/periods.csv'), download: 'inaoe_rotation_periods.csv' }, 'Download periods (CSV)')),
      contTabla)));
  repintar();
}

function figPeriodoAmplitud(filas) {
  const puntos = filas.filter(o => primera(o.id)).map(o => {
    const p = primera(o.id), g = GRUPOS[GRUPO(o)];
    return { x: +p.period_h, y: +p.amplitude_mag, forma: g.forma, color: g.color, r: 4.2, datos: { o, p } };
  });
  const ps = puntos.map(p => p.x), as = puntos.map(p => p.y);
  const xDom = [Math.min(2, ...ps) * 0.9, Math.max(20, ...ps) * 1.1], yDom = [0, Math.max(0.5, Math.ceil(Math.max(0, ...as) * 10) / 10)];
  const presentes = Object.entries(GRUPOS).filter(([k]) => filas.some(o => GRUPO(o) === k && primera(o.id)));
  return el('figure', { class: 'fig', style: 'margin-top:4px' },
    el('div', { class: 'fig-cab' }, leyenda(presentes.map(([k, g]) => [g.forma, g.color, g.nombre, puntos.filter(p => GRUPO(p.datos.o) === k).length]))),
    puntos.length ? lienzo(dispersion({ puntos, xDom, yDom, xLog: true, alto: 300, descripcion: 'Rotation period versus light-curve amplitude',
      xTitulo: ['Rotation period ', varSVG('P'), ' (h)'], yTitulo: ['Amplitude ', varSVG('A'), ' (mag)'],
      tip: d => [el('strong', {}, nombreObjeto(d.o)), el('span', { class: 'mono' }, `P = ${d.p.period_h} ± ${d.p.period_err_h} h`), el('span', { class: 'mono' }, `A = ${d.p.amplitude_mag} mag`), el('span', {}, d.o.population)],
      alClic: d => { location.hash = encodeURIComponent(d.o.id); } })) : el('p', { class: 'vacio' }, 'No periods in this selection.'),
    el('figcaption', {}, el('b', {}, 'Figure 1. '), 'Rotation period (logarithmic scale) and peak-to-peak amplitude of the first light curve of each asteroid. Click a point to open its light curve.'));
}

async function vistaObjetoLC(o) {
  const dets = PERIODOS.filter(p => p.id === o.id);
  const p1 = primera(o.id);
  const sintetico = o.data_status === 'synthetic';
  const g = GRUPOS[GRUPO(o)];
  const dato = (t, v) => el('div', {}, el('dt', {}, t), el('dd', {}, v));
  const fechas = o.observing_dates.split(';').map(s => s.trim()).filter(Boolean);
  const filtrosObs = o.filters.split(';').map(s => s.trim());
  const contFig = el('div', {}, o.data_file ? el('p', { class: 'sub' }, 'Loading light curve…') : el('p', { class: 'vacio' }, 'No light curve is available for this asteroid.'));
  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('div', { class: 'volver' }, el('a', { href: '#' }, '← All light curves')),
    el('section', { class: 'panel' },
      el('div', { class: 'ficha-cab' }, el('h2', {}, nombreObjeto(o)), el('span', { class: 'id' }, o.telescope),
        el('div', { class: 'etiquetas' }, el('span', { class: 'etq cx' }, iconoForma(g.forma, g.color), o.population),
          o.family ? el('span', { class: 'etq' }, `${o.family} family`) : null, o.taxonomy ? el('span', { class: 'etq' }, `Taxonomy ${o.taxonomy}`) : null,
          sintetico ? el('span', { class: 'etq sint', title: 'The plotted light curve is a placeholder, not the observed photometry' }, 'Synthetic light curve') : null)),
      el('div', { class: 'ficha-cuerpo' },
        el('div', {},
          el('dl', { class: 'datos' },
            dato(mv('P', 'h'), p1 ? `${p1.period_h} ± ${p1.period_err_h}` : '—'), dato(mv('A', 'mag'), tal(p1?.amplitude_mag)),
            dato('LCDB P (h)', tal(p1?.lcdb_period_h)), dato('Fourier order', tal(p1?.fourier_order)),
            dato(mv('H', 'mag'), tal(o.h_mag)), dato(mv('D', 'km'), tal(o.d_km)), dato([el('var', {}, 'p'), el('sub', {}, 'V')], tal(o.pv)), dato(mv('a', 'au'), tal(o.a_au))),
          dets.length > 1 ? [el('h3', { style: 'margin-top:20px' }, 'All determinations'),
            el('div', { class: 'tabla-simple' }, el('table', { class: 'simple' },
              el('thead', {}, el('tr', {}, el('th', {}, 'Light curve'), el('th', { class: 'num' }, 'Period (h)'), el('th', { class: 'num' }, 'Amplitude (mag)'), el('th', { class: 'num' }, 'Fourier order'))),
              el('tbody', {}, dets.map(d => el('tr', {}, el('td', {}, `#${d.lightcurve}`), el('td', { class: 'num' }, d.period_h ? `${d.period_h} ± ${d.period_err_h}` : '—'),
                el('td', { class: 'num' }, tal(d.amplitude_mag)), el('td', { class: 'num' }, tal(d.fourier_order)))))))] : null,
          el('h3', { style: 'margin-top:20px' }, 'Observing nights'),
          el('p', { class: 'resumen-obs', style: 'margin-top:0' }, fechas.map((f, i) => [i ? ', ' : '', el('span', { class: 'mono' }, f), filtrosObs[i] && filtrosObs.length > 1 ? ` (${filtrosObs[i]})` : '']),
            filtrosObs.length === 1 ? ` · filter ${filtrosObs[0]}` : '', el('span', { class: 'alias' }, 'Filters: R = R-band; C = clear (no filter).'))),
        contFig)),
    el('section', { class: 'panel' },
      o.notes ? [el('h3', {}, 'Notes'), el('p', { class: 'entrada', style: 'font-size:14px' }, o.notes)] : null,
      el('h3', { style: o.notes ? 'margin-top:16px' : null }, 'Reference'), citaCompleta(o.publication),
      el('details', { style: 'margin-top:8px' }, el('summary', { style: 'cursor:pointer; color:var(--accent); font-size:13px' }, 'BibTeX'), el('pre', { class: 'bibtex' }, bibtex(o.publication))))));
  if (!o.data_file) return;
  let datos;
  try { datos = parseCSV((await cargarTexto(`data/lightcurves/files/${o.data_file}`)).split(/\r?\n/).filter(l => !l.startsWith('#')).join('\n')); }
  catch (e) { contFig.replaceChildren(el('p', { class: 'vacio' }, `File not found: data/lightcurves/files/${o.data_file}`)); return; }
  contFig.replaceChildren(figCurva(o, p1, datos.map(r => ({ jd: +r.jd, mag: +r.mag, err: +r.mag_err || 0 })).filter(r => !isNaN(r.jd) && !isNaN(r.mag))));
}

function figCurva(o, p1, datos) {
  let modo = p1 ? 'fase' : 'tiempo';
  const t0 = Math.min(...datos.map(d => d.jd));
  const dibujar = w => {
    const M = { l: 50, r: 12, t: 16, b: 40 }, H = 320, pw = w - M.l - M.r, ph = H - M.t - M.b;
    const P = p1 ? +p1.period_h / 24 : 1;
    const xs = datos.map(d => modo === 'fase' ? ((d.jd - t0) / P) % 1 : (d.jd - t0));
    const ms = datos.map(d => d.mag);
    const xDom = modo === 'fase' ? [0, 1] : [0, Math.max(...xs) * 1.02 || 1];
    const yDom = [Math.max(...ms.map((m, i) => m + datos[i].err)) + 0.02, Math.min(...ms.map((m, i) => m - datos[i].err)) - 0.02];   // brighter is up
    const x = escala(...xDom, 0, pw), y = escala(yDom[0], yDom[1], ph, 0);
    const g = S('g', { transform: `translate(${M.l},${M.t})` });
    const px = modo === 'fase' ? 0.2 : pasoBonito(xDom[1]), py = pasoBonito(yDom[0] - yDom[1], 5);
    g.append(S('g', { class: 'grid' }, marcas(xDom[0], xDom[1], px).map(t => S('line', { x1: x(t), x2: x(t), y1: 0, y2: ph })),
      marcas(yDom[1], yDom[0], py).map(t => S('line', { x1: 0, x2: pw, y1: y(t), y2: y(t) }))));
    g.append(S('g', {}, marcas(xDom[0], xDom[1], px).map(t => S('text', { x: x(t), y: ph + 15, 'text-anchor': 'middle' }, t.toFixed(decimales(px))))));
    g.append(S('g', {}, marcas(yDom[1], yDom[0], py).map(t => S('text', { x: -7, y: y(t) + 3.5, 'text-anchor': 'end' }, t.toFixed(decimales(py))))));
    g.append(S('line', { class: 'eje', x1: 0, x2: pw, y1: ph, y2: ph }), S('line', { class: 'eje', x1: 0, x2: 0, y1: 0, y2: ph }));
    g.append(tituloEje(modo === 'fase' ? `Rotational phase (P = ${p1.period_h} h)` : 'Days since first observation', { x: pw / 2, y: ph + 32, 'text-anchor': 'middle' }));
    g.append(tituloEje('Relative magnitude (brighter ↑)', { x: -M.l + 2, y: -5, 'text-anchor': 'start' }));
    const capa = S('g', {});
    datos.forEach((d, i) => {
      const cx = x(xs[i]), cy = y(d.mag);
      if (d.err) capa.append(S('line', { class: 'error', x1: cx, x2: cx, y1: y(d.mag - d.err), y2: y(d.mag + d.err) }));
      capa.append(S('circle', { cx, cy, r: 2.3, style: 'fill:var(--accent); stroke:var(--surface); stroke-width:.6' }));
    });
    g.append(capa);
    return S('svg', { class: 'viz', width: w, height: H, role: 'img', 'aria-label': `Light curve of ${nombreObjeto(o)}` }, g);
  };
  const lz = lienzo(dibujar);
  const botones = p1 ? el('div', { class: 'alternar', role: 'group', 'aria-label': 'Horizontal axis' },
    [['fase', 'Phased'], ['tiempo', 'Time']].map(([k, t]) => el('button', { type: 'button', 'aria-pressed': modo === k ? 'true' : 'false',
      onclick: e => { modo = k; e.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); lz.redibujar(); } }, t))) : null;
  return el('figure', { class: 'fig' },
    el('div', { class: 'fig-cab' }, el('span', { class: 'sub' }, `${datos.length} measurements`), botones), lz,
    el('figcaption', {}, el('b', {}, 'Figure. '), `Light curve of ${nombreObjeto(o)}${p1 ? ', folded with the published rotation period' : ''}.`,
      o.data_status === 'synthetic' ? el('span', { style: 'display:block; margin-top:6px; color:var(--warn)' }, 'This light curve is a synthetic placeholder generated from the published period and amplitude; it is not the observed photometry.') : null),
    el('div', { class: 'descargas' }, el('a', { href: ruta(`data/lightcurves/files/${o.data_file}`), download: o.data_file }, `Download photometry (${o.data_file})`)));
}

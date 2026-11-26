/* common.js — Shared code for every page of the site: header and footer, CSV loading,
   publications, taxonomy helpers and small SVG chart utilities.
   Content lives in data/*.csv; you should not need to edit this file to add objects. */
'use strict';

const RAIZ = new URL('..', document.currentScript.src);          // site root, wherever it is hosted
const ruta = p => new URL(p, RAIZ).href;

/* ---------------- DOM helpers ---------------- */
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') { if (v) e.className = v; }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const h of hijos.flat(2)) if (h != null && h !== false) e.append(h instanceof Node ? h : document.createTextNode(h));
  return e;
};
const SVGNS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, ...hijos) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const h of hijos.flat(2)) if (h != null && h !== false) e.append(h instanceof Node ? h : document.createTextNode(h));
  return e;
};
const mv = (s, u) => [el('var', {}, s), u ? ` (${u})` : ''];   // math variable: italic symbol + unit

/* ---------------- Data loading ---------------- */
function parseCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const filas = []; let fila = [], campo = '', q = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (q) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false; }
      else campo += c;
    } else if (c === '"') q = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = ''; filas.push(fila); fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const datos = filas.filter(f => f.some(x => x.trim() !== ''));
  const cab = datos.shift().map(h => h.trim());
  return datos.map(f => Object.fromEntries(cab.map((h, i) => [h, (f[i] ?? '').trim()])));
}
async function cargarTexto(p) {
  const r = await fetch(ruta(p), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Could not load ${p} (HTTP ${r.status})`);
  return r.text();
}
const cargarCSV = async p => parseCSV(await cargarTexto(p));
function errorCarga(e) {
  const local = location.protocol === 'file:';
  $('#contenido').replaceChildren(el('div', { class: 'panel' }, el('h2', {}, 'The data could not be loaded'),
    el('p', { class: 'sub' }, local
      ? 'This page reads its data with the browser and must be opened from the website (or a local web server), not by double-clicking the file.'
      : String(e.message || e))));
  console.error(e);
}

/* ---------------- Formatting ---------------- */
const vacio = v => v == null || v === '' || (typeof v === 'number' && isNaN(v));
const num = (v, d = 2) => vacio(v) || isNaN(+v) ? '—' : (+v).toFixed(d);
const tal = v => vacio(v) ? '—' : String(v);          // value exactly as published (keeps its precision)
const nombreObjeto = o => o.number ? `(${o.number}) ${o.name}` : o.name;
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------------- Taxonomy (Bus & Binzel 2002) ---------------- */
const COMPLEJOS = [
  { id: 'S', nombre: 'S-complex', color: 'var(--cx-s)', forma: 'circulo', clases: ['S', 'Sa', 'Sk', 'Sl', 'Sq', 'Sr', 'A', 'K', 'L', 'Q', 'R'] },
  { id: 'C', nombre: 'C-complex', color: 'var(--cx-c)', forma: 'cuadro', clases: ['C', 'B', 'Cb', 'Cg', 'Cgh', 'Ch'] },
  { id: 'X', nombre: 'X-complex', color: 'var(--cx-x)', forma: 'rombo', clases: ['X', 'Xc', 'Xe', 'Xk'] },
  { id: 'V', nombre: 'V-type', color: 'var(--cx-v)', forma: 'triangulo', clases: ['V', 'O'] },
  { id: 'O', nombre: 'Other end-members', color: 'var(--cx-o)', forma: 'circulo', clases: ['D', 'T', 'Ld'] },
];
const complejoDe = clase => COMPLEJOS.find(c => c.clases.includes(clase)) || COMPLEJOS[4];
const POBLACION = { flora_member: 'Flora family member', flora_background: 'Flora neighbourhood (background)', nea_aten: 'Near-Earth asteroid (Aten)', nea_apollo: 'Near-Earth asteroid (Apollo)' };

function marcador(forma, x, y, r, color, extra = {}) {
  const st = `fill:${color}; stroke:var(--surface); stroke-width:1.2`;
  if (forma === 'cuadro') return S('rect', { x: x - r * .9, y: y - r * .9, width: r * 1.8, height: r * 1.8, style: st, ...extra });
  if (forma === 'rombo') return S('path', { d: `M${x},${y - r * 1.25}L${x + r * 1.25},${y}L${x},${y + r * 1.25}L${x - r * 1.25},${y}Z`, style: st, ...extra });
  if (forma === 'triangulo') return S('path', { d: `M${x},${y - r * 1.3}L${x + r * 1.2},${y + r * .85}L${x - r * 1.2},${y + r * .85}Z`, style: st, ...extra });
  return S('circle', { cx: x, cy: y, r, style: st, ...extra });
}
const iconoForma = (forma, color) => S('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true', style: 'vertical-align:-1px; margin-right:6px' }, marcador(forma, 6, 6, 4, color));
const leyenda = items => el('div', { class: 'leyenda' }, items.map(([forma, color, texto, n]) =>
  el('span', {}, iconoForma(forma, color), texto, n != null ? el('span', { class: 'n' }, ` ${n}`) : null)));

/* ---------------- Publications ---------------- */
let PUBS = new Map();
async function cargarPublicaciones() { PUBS = new Map((await cargarCSV('data/publications.csv')).map(p => [p.id, p])); return PUBS; }
const autoresCortos = p => { const a = p.authors.split(',').map(s => s.trim()).filter(Boolean); return a.length > 2 ? `${a[0]} et al.` : p.authors; };
function enlacePub(p) {
  if (p.doi) return `https://doi.org/${p.doi}`;
  if (p.ads) return `https://ui.adsabs.harvard.edu/abs/${p.ads}`;
  return p.url || null;
}
function citaCorta(id) {
  const p = PUBS.get(id); if (!p) return id;
  const url = enlacePub(p), txt = `${autoresCortos(p).replace(/ ([A-Z]\.\s?)+et al\./, ' et al.')} ${p.year}`;
  return url ? el('a', { href: url, rel: 'noopener' }, txt) : txt;
}
function citaCompleta(id) {
  const p = PUBS.get(id); if (!p) return el('span', {}, id);
  const url = enlacePub(p);
  return el('p', { class: 'cita' }, `${p.authors} ${p.year}. “${p.title}”. `, el('i', {}, p.journal), `, ${p.volume}, ${p.pages}.`,
    url ? [' ', el('a', { href: url, rel: 'noopener' }, p.doi ? `doi:${p.doi}` : url)] : null);
}
function bibtex(id) {
  const p = PUBS.get(id); if (!p) return '';
  const autor = a => a.replace(/^(.+?)\s+((?:[A-Z][a-z]?\.\s?)+)$/u, '$1, $2').trim();   // 'Buendia E.' → 'Buendia, E.'
  const campos = [['author', p.authors.split(',').map(s => s.trim()).filter(Boolean).map(autor).join(' and ')], ['title', `{${p.title}}`],
    ['journal', p.journal], ['year', p.year], ['volume', p.volume], ['pages', p.pages], ['doi', p.doi]].filter(([, v]) => v);
  return `@article{${p.id},\n` + campos.map(([k, v]) => `  ${k.padEnd(7)} = {${v}}`).join(',\n') + '\n}';
}

/* ---------------- Header, notice and footer ---------------- */
const MODULOS = [
  { n: 'I', id: 'observations', t: 'Observations', d: 'Internal archive', estado: 'INAOE network' },
  { n: 'II', id: 'spectra', t: 'Spectra', d: 'Reflectance and taxonomy', href: 'spectra/' },
  { n: 'III', id: 'classification', t: 'Classification', d: 'Taxonomic classifier', estado: 'in preparation', href: 'classification/' },
  { n: 'IV', id: 'lightcurves', t: 'Light curves', d: 'Tonantzintla Schmidt Camera', href: 'lightcurves/' },
];
function cabecera({ activo = '', fits = null } = {}) {
  const modulo = m => {
    const contenido = [el('span', { class: 'num' }, m.n), el('span', {}, el('b', {}, m.t), el('small', {}, m.d, m.estado ? [' · ', el('span', { class: 'estado' }, m.estado)] : null))];
    return m.href ? el('a', { class: 'mod' + (m.id === activo ? ' activo' : ''), href: ruta(m.href), 'aria-current': m.id === activo ? 'page' : null }, contenido)
                  : el('span', { class: 'mod prox', title: 'Available inside the INAOE network' }, contenido);
  };
  $('#cabecera').replaceChildren(el('header', { class: 'cab' },
    el('div', { class: 'banda' }, el('div', { class: 'ancho' },
      el('span', { class: 'inst' }, 'National Institute of Astrophysics, Optics and Electronics (INAOE)'),
      el('span', { class: 'sede' }, 'Tonantzintla, Puebla · Mexico'))),
    el('div', { class: 'ancho titulo' },
      el('div', { class: 'marca' },
        el('div', { class: 'kicker' }, 'Asteroid spectroscopy and photometry'),
        el('h1', {}, el('a', { href: ruta('./') }, 'INAOE Minor Planets Group')),
        el('p', { class: 'desc' }, 'Published results from the 2.1-m telescope of the Guillermo Haro Astrophysical Observatory (OAGH) and the Tonantzintla Schmidt Camera.')),
      fits ? el('pre', { class: 'fits', 'aria-label': 'Site contents' }, tarjetaFits(fits)) : null),
    el('nav', { class: 'ancho modulos', 'aria-label': 'Site sections' }, MODULOS.map(modulo))),
    el('div', { id: 'aviso' }));
  document.body.append(el('div', { class: 'tip', id: 'tip', hidden: true }));
}
function tarjetaFits(lineas) {
  const ancho = Math.max(12, ...lineas.map(l => String(l[1]).length));
  return lineas.flatMap(([k, v, c], i) => [i ? '\n' : null, el('span', { class: 'k' }, k.padEnd(8)), '= ',
    el('span', { class: 'v' }, typeof v === 'number' ? String(v).padStart(ancho) : String(v).padEnd(ancho)), el('span', { class: 'c' }, ' / ' + c)]);
}
/* Shows the preview notice while any dataset on the page is still a synthetic placeholder. */
function avisoVistaPrevia(cuantos, que) {
  if (!cuantos) { $('#aviso').replaceChildren(); return; }
  $('#aviso').replaceChildren(el('div', { class: 'vista-previa' }, el('div', { class: 'ancho' },
    el('b', {}, 'Preview. '), `${cuantos} ${que} on this page ${cuantos === 1 ? 'is a synthetic placeholder' : 'are synthetic placeholders'}, generated from the published results only to show how the site works; they are not observed data. `,
    'All tabulated values (classes, periods, amplitudes, dates) are taken from the publications.')));
}
function pie() {
  $('#pie').replaceChildren(el('footer', { class: 'pie' }, el('div', { class: 'ancho' },
    el('div', {}, el('b', {}, 'INAOE Minor Planets Group'), el('br'),
      'Instituto Nacional de Astrofísica, Óptica y Electrónica · Luis Enrique Erro No. 1, Tonantzintla, Puebla, Mexico, C.P. 72840'),
    el('div', { style: 'text-align:right' }, 'Data on this site come from the publications listed on the ', el('a', { href: ruta('./#publications') }, 'home page'), '.', el('br'),
      'Please cite the original publication when using them.'))));
}

/* ---------------- Charts ---------------- */
function mostrarTip(x, y, ...lineas) {
  const tip = $('#tip'); tip.replaceChildren(...lineas); tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let l = x + 14, t = y + 14;
  if (l + w > innerWidth - 8) l = x - w - 14;
  if (t + h > innerHeight - 8) t = y - h - 14;
  tip.style.left = Math.max(8, l) + 'px'; tip.style.top = Math.max(8, t) + 'px';
}
const ocultarTip = () => { const t = $('#tip'); if (t) t.hidden = true; };
function lienzo(dibujar) {
  const div = el('div', { class: 'lienzo' });
  let ancho = 0;
  const ro = new ResizeObserver(([e]) => {
    if (!div.isConnected) { ro.disconnect(); return; }
    const w = Math.floor(e.contentRect.width);
    if (w && w !== ancho) { ancho = w; div.replaceChildren(dibujar(w)); }
  });
  ro.observe(div);
  div.redibujar = () => { if (ancho) div.replaceChildren(dibujar(ancho)); };
  return div;
}
const escala = (d0, d1, r0, r1) => x => r0 + (x - d0) / (d1 - d0) * (r1 - r0);
const marcas = (min, max, paso) => { const t = []; for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + 1e-9; v += paso) t.push(+v.toFixed(6)); return t; };
const pasoBonito = (rango, n = 5) => { const crudo = rango / n, p = 10 ** Math.floor(Math.log10(crudo)), f = crudo / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
const decimales = paso => Math.max(0, -Math.floor(Math.log10(paso) + 1e-9));
const tituloEje = (texto, attrs) => S('text', { class: 'titulo-eje', ...attrs }, texto);
const varSVG = s => S('tspan', { style: 'font-style:italic; font-family:var(--font-serif); font-size:13px' }, s);

/* Scatter with nearest-point hover. puntos: [{x, y, forma, color, r, datos}] */
let idRecorte = 0;
function dispersion({ puntos, xDom, yDom, xTitulo, yTitulo, alto = 320, xLog = false, yInv = false, alClic, tip, extras, fondo, descripcion = 'Scatter plot' }) {
  return w => {
    const M = { l: 46, r: 12, t: 30, b: 40 }, H = alto;
    const pw = w - M.l - M.r, ph = H - M.t - M.b;
    const fx = xLog ? (v => Math.log10(v)) : (v => v);
    const x = (v => escala(fx(xDom[0]), fx(xDom[1]), 0, pw)(fx(v)));
    const y = yInv ? escala(yDom[0], yDom[1], 0, ph) : escala(yDom[0], yDom[1], ph, 0);
    const g = S('g', { transform: `translate(${M.l},${M.t})` });
    const tx = xLog ? [0.5, 1, 2, 3, 5, 10, 20, 50, 100].filter(v => v >= xDom[0] && v <= xDom[1]) : marcas(xDom[0], xDom[1], pasoBonito(xDom[1] - xDom[0]));
    const py = pasoBonito(yDom[1] - yDom[0]), ty = marcas(yDom[0], yDom[1], py);
    g.append(S('g', { class: 'grid' }, tx.map(t => S('line', { x1: x(t), x2: x(t), y1: 0, y2: ph })), ty.map(t => S('line', { x1: 0, x2: pw, y1: y(t), y2: y(t) }))));
    const dx = xLog ? (t => String(t)) : (t => t.toFixed(decimales(pasoBonito(xDom[1] - xDom[0]))));
    g.append(S('g', {}, tx.map(t => S('text', { x: x(t), y: ph + 15, 'text-anchor': 'middle' }, dx(t)))));
    g.append(S('g', {}, ty.map(t => S('text', { x: -7, y: y(t) + 3.5, 'text-anchor': 'end' }, t.toFixed(decimales(py))))));
    g.append(S('line', { class: 'eje', x1: 0, x2: pw, y1: ph, y2: ph }), S('line', { class: 'eje', x1: 0, x2: 0, y1: 0, y2: ph }));
    g.append(tituloEje(xTitulo, { x: pw / 2, y: ph + 32, 'text-anchor': 'middle' }));
    g.append(tituloEje(yTitulo, { x: -M.l + 2, y: -17, 'text-anchor': 'start' }));          // above the top tick label
    const recorte = 'recorte' + (++idRecorte);
    g.append(S('defs', {}, S('clipPath', { id: recorte }, S('rect', { x: 0, y: 0, width: pw, height: ph }))));
    if (fondo && fondo.length) {          // context population: one path of tiny squares, cheap to draw
      let d = '';
      for (const [fa, fb] of fondo) if (fa >= xDom[0] && fa <= xDom[1] && fb >= Math.min(...yDom) && fb <= Math.max(...yDom)) d += `M${x(fa).toFixed(1)} ${y(fb).toFixed(1)}h1.4v1.4h-1.4z`;
      g.append(S('path', { class: 'fondo-pob', d }));
    }
    if (extras) g.append(S('g', { 'clip-path': `url(#${recorte})` }, extras({ x, y, pw, ph, xDom, yDom })));
    const px = puntos.filter(p => p.x >= xDom[0] && p.x <= xDom[1] && p.y >= Math.min(...yDom) && p.y <= Math.max(...yDom)).map(p => ({ ...p, sx: x(p.x), sy: y(p.y) }));
    g.append(S('g', {}, px.map(p => marcador(p.forma, p.sx, p.sy, p.r || 3.6, p.color))));
    const anillo = S('circle', { r: 7, style: 'fill:none; stroke:var(--ink); stroke-width:1.5', visibility: 'hidden' });
    g.append(anillo);
    const svg = S('svg', { class: 'viz', width: w, height: H, role: 'img', 'aria-label': descripcion }, g);
    let actual = null;
    g.append(S('rect', { x: 0, y: 0, width: pw, height: ph, fill: 'transparent',
      onpointermove: e => {
        const r = svg.getBoundingClientRect(), mx = e.clientX - r.left - M.l, my = e.clientY - r.top - M.t;
        let mejor = null, d2 = 15 * 15;
        for (const p of px) { const d = (p.sx - mx) ** 2 + (p.sy - my) ** 2; if (d < d2) { d2 = d; mejor = p; } }
        actual = mejor;
        if (!mejor) { anillo.setAttribute('visibility', 'hidden'); ocultarTip(); e.currentTarget.style.cursor = 'default'; return; }
        anillo.setAttribute('cx', mejor.sx); anillo.setAttribute('cy', mejor.sy); anillo.setAttribute('visibility', 'visible');
        e.currentTarget.style.cursor = alClic ? 'pointer' : 'default';
        mostrarTip(e.clientX, e.clientY, ...tip(mejor.datos));
      },
      onpointerleave: () => { anillo.setAttribute('visibility', 'hidden'); ocultarTip(); actual = null; },
      onclick: () => { if (actual && alClic) { ocultarTip(); alClic(actual.datos); } } }));
    return svg;
  };
}

/* Sortable booktabs table. columnas: [{k, t, f?, v?, num?, mono?}] */
function tablaOrdenable(filas, columnas, { onFila, orden, dir = 1, textoVacio = 'No rows match these filters.', limite = 400 } = {}) {
  const caja = el('div', { class: 'tabla-cont' });
  const pintar = () => {
    if (!filas.length) { caja.replaceChildren(el('div', { class: 'vacio' }, textoVacio)); return; }
    let datos = filas;
    if (orden) {
      const c = columnas.find(c => c.k === orden), val = c.v || (f => f[c.k]);
      datos = [...filas].sort((a, b) => {
        const x = val(a), y = val(b);
        if (vacio(x)) return 1; if (vacio(y)) return -1;
        const nx = +x, ny = +y;
        return (!isNaN(nx) && !isNaN(ny) ? nx - ny : String(x).localeCompare(String(y), 'en', { numeric: true })) * dir;
      });
    }
    const thead = el('thead', {}, el('tr', {}, columnas.map(c => el('th', { class: c.num ? 'num' : null, 'data-orden': orden === c.k ? (dir > 0 ? '▲' : '▼') : null,
      onclick: () => { if (orden === c.k) dir = -dir; else { orden = c.k; dir = 1; } pintar(); } }, c.t))));
    const tbody = el('tbody', {}, datos.slice(0, limite).map(f => el('tr', { class: onFila ? 'clic' : null, onclick: onFila ? () => onFila(f) : null },
      columnas.map(c => { const v = c.f ? c.f(f) : f[c.k]; return el('td', { class: [c.num && 'num', c.mono && 'mono'].filter(Boolean).join(' ') }, vacio(v) ? '—' : v); }))));
    caja.replaceChildren(el('table', {}, thead, tbody));
  };
  pintar();
  return caja;
}
const enlaceInterno = (texto, hash) => el('a', { href: '#' + hash, onclick: e => { e.stopPropagation(); } }, texto);


/* ---------------- Orbital-element figures (a–e and a–i) ----------------
   Region boundaries as in the group's NEO / Mars-crosser plots. Optional files in data/orbits/:
   nu6.csv and nu16.csv (secular resonances, columns a_au,i_deg) and background.csv (a sample of
   known asteroids, columns a,e,i) drawn as faint grey context. */
let CAPAS_ORB = { nu6: [], nu16: [], fondo: [] };
async function cargarCapasOrbitales() {
  const opcional = p => cargarCSV(p).catch(() => []);
  const [nu6, nu16, fondo] = await Promise.all([opcional('data/orbits/nu6.csv'), opcional('data/orbits/nu16.csv'), opcional('data/orbits/background.csv')]);
  const par = r => [+r.a_au, +r.i_deg];
  CAPAS_ORB = { nu6: nu6.map(par).filter(p => !isNaN(p[0] + p[1])), nu16: nu16.map(par).filter(p => !isNaN(p[0] + p[1])),
    fondo: fondo.map(r => ({ a: +r.a, e: r.e === '' ? NaN : +r.e, i: r.i === '' ? NaN : +r.i })).filter(r => r.a > 0) };
  return CAPAS_ORB;
}
const MARCO_ORB = { e: { xDom: [0.5, 3.5], yDom: [0, 1] }, i: { xDom: [0.9, 3.5], yDom: [0, 40] } };
/* Frame of a figure: the fixed frame, raised in steps of 5° when an object has i > 40°; or the data extent for the zoom view. */
function marcoOrbital(eje, vista, puntos) {
  let { xDom, yDom } = MARCO_ORB[eje];
  if (!puntos.length) return { xDom, yDom };
  const as = puntos.map(p => p.x), vs = puntos.map(p => p.y);
  if (vista === 'zoom') {
    const paso = eje === 'e' ? 0.05 : 1;
    return { xDom: [Math.floor(Math.min(...as) * 20) / 20 - 0.05, Math.ceil(Math.max(...as) * 20) / 20 + 0.05],
             yDom: [0, Math.ceil(Math.max(...vs) / paso) * paso + paso] };
  }
  if (eje === 'i' && Math.max(...vs) > yDom[1]) yDom = [yDom[0], Math.ceil(Math.max(...vs) / 5) * 5];
  return { xDom, yDom };
}
const RESONANCIAS_MM = [[1.780, '5:1'], [2.065, '4:1'], [2.502, '3:1']];
const textoHalo = (attrs, ...hijos) => S('text', { ...attrs, style: `paint-order:stroke; stroke:var(--surface); stroke-width:3.5px; ${attrs.style || ''}` }, ...hijos);
const conSubindice = (base, sub) => [base, S('tspan', { 'baseline-shift': 'sub', style: 'font-size:.75em' }, sub)];

function capasOrbitales(eje) {
  return ({ x, y, pw, ph, xDom, yDom }) => {
    const g = S('g', { class: 'capas-orb' });
    const dentro = (a, v) => a >= xDom[0] && a <= xDom[1] && v >= yDom[0] && v <= yDom[1];
    const trazo = (pts, clase) => S('path', { class: clase, d: pts.map((p, k) => `${k ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('') });
    const muestreo = (f, a0, a1) => { const n = 240, pts = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push([a, f(a)]); } return pts; };
    /* label placed along a curve, rotated with its local slope */
    const holgado = (p, m = 30) => dentro(p[0], p[1]) && x(p[0]) > m && x(p[0]) < pw - 4 && y(p[1]) > 18 && y(p[1]) < ph - 6;   // keeps labels off the frame
    /* cerca: fraction along the visible curve, or { y } to sit at that ordinate whatever the figure's width */
    const rotulo = (texto, pts, cerca, { lado = -5, ancla = 'end', estilo = '' } = {}) => {
      const vis = pts.filter(p => holgado(p, ancla === 'end' ? 80 : 14));
      if (vis.length < 2) return null;
      const k = typeof cerca === 'object'
        ? Math.max(1, vis.reduce((m, p, j) => Math.abs(p[1] - cerca.y) < Math.abs(vis[m][1] - cerca.y) ? j : m, 0))
        : Math.max(1, Math.min(vis.length - 1, Math.round(cerca * (vis.length - 1))));
      const [a0, v0] = vis[k - 1], [a1, v1] = vis[k];
      let ang = Math.atan2(y(v1) - y(v0), x(a1) - x(a0)) * 180 / Math.PI;
      if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;       // never upside down
      const px = x(a1), py = y(v1);
      return textoHalo({ x: px, y: py, dy: lado, 'text-anchor': ancla, transform: `rotate(${ang.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})`, class: 'rotulo-linea', style: estilo }, texto);
    };
    const region = (texto, a, v, clase = 'rotulo-region') => {
      if (!dentro(a, v)) return null;
      const mitad = texto.length * (clase.includes('grande') ? 4.4 : 3.7);              // half the label width, roughly
      const cx = Math.min(Math.max(x(a), mitad + 4), pw - mitad - 4);                    // keep it inside the frame on narrow screens
      return textoHalo({ x: cx, y: y(v), 'text-anchor': 'middle', class: clase }, texto);
    };
    if (eje === 'e') {
      const curvas = [
        ['q = 1.017 au', muestreo(a => 1 - 1.017 / a, 1.017, 4)],
        ['q = 1.3 au', muestreo(a => 1 - 1.3 / a, 1.3, 4)],
        ['q = 1.67 au', muestreo(a => 1 - 1.67 / a, 1.67, 4)],
      ];
      const aten = muestreo(a => 0.983 / a - 1, 0.45, 0.983);                       // aphelion Q = 0.983 au
      for (const [, pts] of curvas) g.append(trazo(pts, 'limite-orb'));
      g.append(trazo(aten, 'limite-orb'));
      if (1 >= xDom[0] && 1 <= xDom[1]) g.append(S('line', { class: 'limite-orb', x1: x(1), x2: x(1), y1: 0, y2: ph }));
      for (const [t, pts] of curvas) g.append(rotulo(t, pts, 0.97));
      g.append(rotulo('Q = 0.983 au', aten.slice().reverse(), { y: 0.55 }, { lado: -6, ancla: 'middle' }));      // clear of the Atens at low e
      g.append(region('Atiras', 0.62, 0.05), region('Atens', 0.80, 0.85), region('Apollos', 1.65, 0.85),
               region('Amors', 2.15, 0.46), region('MCs', 1.5, 0.02), region('Main belt', 3.0, 0.24, 'rotulo-region grande'));
    } else {
      for (const [a, t] of RESONANCIAS_MM) if (a >= xDom[0] && a <= xDom[1]) {
        g.append(S('line', { class: 'resonancia-mm', x1: x(a), x2: x(a), y1: 14, y2: ph }));
        g.append(textoHalo({ x: x(a), y: 11, 'text-anchor': 'middle', class: 'rotulo-linea' }, t));
      }
      for (const [nombre, sub, pts, cerca] of [['ν', '6', CAPAS_ORB.nu6, 0.72], ['ν', '16', CAPAS_ORB.nu16, 0.78]]) {
        if (!pts.length) continue;
        g.append(trazo(pts, 'resonancia-sec'));
        const vis = pts.filter(p => holgado(p, 10) && x(p[0]) < pw - 40);
        if (vis.length) {
          const [a, v] = vis[Math.min(vis.length - 1, Math.round(cerca * (vis.length - 1)))];
          g.append(textoHalo({ x: x(a) + 7, y: y(v) - 7, class: 'rotulo-region', style: 'font-style:italic; font-family:var(--font-serif); font-size:14px' }, conSubindice(nombre, sub)));
        }
      }
    }
    return g;
  };
}

/* Builds the draw function of an a–e or a–i figure. vista: 'full' (frames of the group's plots) or 'zoom'. */
function figuraOrbital({ eje = 'e', vista = 'full', puntos, alto = 360, tip, alClic, descripcion }) {
  const { xDom, yDom } = marcoOrbital(eje, vista, puntos);
  const fondo = CAPAS_ORB.fondo.filter(r => !isNaN(r[eje])).map(r => [r.a, r[eje]]);
  return dispersion({ puntos, xDom, yDom, alto, tip, alClic, fondo, extras: capasOrbitales(eje), descripcion,
    xTitulo: ['Semimajor axis ', varSVG('a'), ' (au)'], yTitulo: eje === 'e' ? ['Eccentricity ', varSVG('e')] : ['Inclination ', varSVG('i'), ' (°)'] });
}
const fueraDeMarco = (puntos, eje, vista) => { if (vista === 'zoom') return []; const { xDom, yDom } = marcoOrbital(eje, vista, puntos);
  return puntos.filter(p => p.x < xDom[0] || p.x > xDom[1] || p.y < yDom[0] || p.y > yDom[1]); };

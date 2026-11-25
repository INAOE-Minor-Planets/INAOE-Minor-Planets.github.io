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
function dispersion({ puntos, xDom, yDom, xTitulo, yTitulo, alto = 320, xLog = false, yInv = false, alClic, tip, extras, descripcion = 'Scatter plot' }) {
  return w => {
    const M = { l: 46, r: 12, t: 16, b: 40 }, H = alto;
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
    g.append(tituloEje(yTitulo, { x: -M.l + 2, y: -5, 'text-anchor': 'start' }));
    if (extras) g.append(extras({ x, y, pw, ph }));
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

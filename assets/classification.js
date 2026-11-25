/* classification.js — Module III: description of the hybrid classification method.
   The interactive classifier will be added here once the model files are ready (data/classification/). */
'use strict';

(async function () {
  cabecera({ activo: 'classification' }); pie();
  let rend;
  try { [rend] = await Promise.all([cargarCSV('data/classification/performance.csv'), cargarPublicaciones()]); }
  catch (e) { return errorCarga(e); }

  const metodos = [...new Set(rend.map(r => r.method))];
  const etiquetas = [...new Set(rend.map(r => r.label))];
  const valor = (m, l, k) => (rend.find(r => r.method === m && r.label === l) || {})[k] || '—';
  const tabla = el('div', { class: 'tabla-cont corta' }, el('table', {},
    el('thead', {},
      el('tr', {}, el('th', { rowspan: 2 }, 'Label'), metodos.map(m => el('th', { colspan: 3, style: 'text-align:center' }, m))),
      el('tr', {}, metodos.map(() => ['Accuracy', 'Recall', 'F1'].map(t => el('th', { class: 'num' }, t))))),
    el('tbody', {}, etiquetas.map(l => el('tr', {}, el('td', {}, el('b', {}, l)),
      metodos.map(m => ['accuracy', 'recall', 'f1'].map(k => el('td', { class: 'num' }, valor(m, l, k)))))))));

  $('#contenido').replaceChildren(el('div', { class: 'pila' },
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h2', {}, 'Taxonomic classification'), el('span', { class: 'etq sint' }, 'Interactive tool in preparation')),
      el('p', { class: 'entrada' }, 'Our classifications follow the hybrid approach of Buendia et al. (2026), which combines a spectral distance with three machine-learning classifiers. It works on visible reflectance spectra in the Bus & Binzel (2002) taxonomy, between 0.44 and 0.92 µm.'),
      el('p', { class: 'entrada' }, 'Soon you will be able to load your own spectrum here and classify it directly in your browser; the file will not be sent anywhere.')),
    el('div', { class: 'rejilla-2' },
      el('section', { class: 'panel' }, el('h3', {}, 'How it works'),
        el('ol', { class: 'pasos' },
          el('li', {}, 'The spectrum is resampled to 49 points between 0.44 and 0.92 µm and normalized at 0.55 µm, the format of the SMASS database.'),
          el('li', {}, el('b', {}, 'Spectral distance. '), 'Its Euclidean distance to each of the 1367 spectra of the e-SMASS reference set is computed. The k = 10 closest spectra vote for their class, weighted by how common each class is in the reference set (the weight function).'),
          el('li', {}, el('b', {}, 'k-nearest neighbours. '), 'Three k-NN classifiers — on the original spectra, after a principal component analysis (PCA) and after a neighbourhood component analysis (NCA) — assign one of five labels: S, C, X, PS (positive slope beyond 0.75 µm) or NS (negative slope).'),
          el('li', {}, 'When the four methods agree on the type, the spectral distance selects the specific class (for example Sq or Xk).'))),
      el('section', { class: 'panel' }, el('h3', {}, 'Classify a spectrum'),
        el('div', { class: 'zona-subida', 'aria-disabled': 'true' }, el('b', {}, 'Coming soon'),
          'Upload a two-column text file (wavelength, reflectance) in Å or µm.'),
        el('p', { class: 'sub', style: 'margin-top:12px' }, 'Meanwhile, the original code is available in its ',
          el('a', { href: 'https://github.com/enriquebuendia/taxonomia_asteroides', rel: 'noopener' }, 'GitHub repository'), '.'))),
    el('section', { class: 'panel' },
      el('div', { class: 'cab-seccion' }, el('h3', {}, 'Performance of the k-NN classifiers'),
        el('p', { class: 'sub' }, 'Test set: 25 per cent of e-SMASS (163 S, 104 C, 52 X, 12 PS and 11 NS spectra).')),
      tabla,
      el('p', { class: 'sub', style: 'margin-top:8px' }, 'Values from Tables 2–4 of Buendia et al. (2026).')),
    el('section', { class: 'panel' }, el('h3', {}, 'Reference'), citaCompleta('buendia2026'),
      el('details', { style: 'margin-top:8px' }, el('summary', { style: 'cursor:pointer; color:var(--accent); font-size:13px' }, 'BibTeX'), el('pre', { class: 'bibtex' }, bibtex('buendia2026'))))));
})();

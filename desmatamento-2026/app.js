(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const data = window.CLIMATE_DATA, maps = window.MAPS_DATA, math = window.ClimateMath;
  const sceneIds = ['inicio', 'florestas', 'agua', 'futuro'];
  const sceneNames = ['O começo', 'A vegetação', 'A água', 'O futuro'];
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const percentFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  let result, selectedBiome = 'amazonia', currentScene = 0;
  const input = $('#birth-year');
  input.max = String(new Date().getFullYear());

  function compact(value) {
    if (value >= 1e6) return decimal.format(value / 1e6) + ' mi';
    if (value >= 1e4) return decimal.format(value / 1e3) + ' mil';
    return integer.format(value);
  }
  function mapSvg(body, label = '', extra = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${maps.viewBox}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${extra}${body}</svg>`;
  }
  function statePaths(highlight) {
    return maps.states.map(s => `<path class="state${s.region === highlight ? ' active' : ''}" d="${s.path}"/>`).join('');
  }
  function regionMap(region) {
    const states = maps.states.filter(s => s.region === region);
    const points = states.flatMap(s => s.path.match(/-?\d+(?:\.\d+)?/g).map(Number));
    const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1);
    const left = Math.min(...xs), top = Math.min(...ys);
    const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
    const box = [left - 5, top - 5, width + 10, height + 10].join(' ');
    const dry = region === 'Nordeste', id = `region-${region.toLowerCase()}`;
    const silhouette = states.map(s => `<path d="${s.path}"/>`).join('');
    // Decorative water and soil textures share the real regional silhouette.
    // Their height and cracks do not encode an affected area or the percentage.
    const stops = dry
      ? '<stop stop-color="#e4b591"/><stop offset=".36" stop-color="#c67453"/><stop offset=".7" stop-color="#9d4239"/><stop offset="1" stop-color="#52252b"/>'
      : '<stop stop-color="#b3b8a4"/><stop offset=".35" stop-color="#7a9998"/><stop offset="1" stop-color="#34536a"/>';
    const surface = dry
      ? `<g class="soil-cracks"><path d="M17 -4 22 13 16 26 25 39 19 53 27 69 19 86 24 104M57 -3 49 15 56 29 48 43 59 58 51 75 60 91 56 104M94 0 83 18 91 34 80 50 89 66 79 81 86 103M-3 15 9 20 22 13 36 21 49 15 68 22 83 18 104 24M-3 45 12 48 25 39 38 46 48 43 65 36 76 42 91 34 105 41M-3 70 12 63 19 53 38 62 59 58 73 68 89 66 104 73M-3 92 19 86 36 90 51 75 68 84 79 81 103 91"/><path class="soil-fissures" d="M22 13 28 8 30 0M16 26 8 32 5 39M36 21 38 33 33 38M56 29 66 26 71 29M25 39 29 49 37 52M19 53 8 56 4 53M48 43 44 54M80 50 70 54 69 61M27 69 36 73 40 81M51 75 47 68M60 91 70 94 74 103M19 86 12 80M89 66 98 60M83 18 76 9 78 3"/></g>`
      : `<path class="flood-water" d="M-5 35C8 31 16 39 29 35S49 31 62 35 83 39 105 34V105H-5Z" style="fill:url(#${id}-water)"/>
         <g class="water-ripples"><path class="waterline" d="M-5 35C8 31 16 39 29 35S49 31 62 35 83 39 105 34"/><path d="M4 44Q15 41 26 44M39 45Q52 42 67 45M79 43Q89 41 101 43M15 55Q28 52 41 55M55 56Q71 53 87 56M-2 66Q10 63 23 66M35 65Q50 62 65 65M79 68Q94 65 105 67M12 77Q29 74 44 77M62 79Q77 76 92 79M-4 88Q11 85 25 88M38 90Q52 87 66 90M76 98Q91 95 104 98"/></g>`;
    return `<svg viewBox="${box}" aria-hidden="true">
      <defs>
        <clipPath id="${id}-clip">${silhouette}</clipPath>
        <linearGradient id="${id}-ground" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
        <linearGradient id="${id}-water" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="100"><stop stop-color="#75bacd"/><stop offset=".34" stop-color="#377f9e"/><stop offset=".72" stop-color="#20516e"/><stop offset="1" stop-color="#142d49"/></linearGradient>
        <filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".22" numOctaves="3" seed="12" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      </defs>
      <g clip-path="url(#${id}-clip)">
        <rect x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#${id}-ground)"/>
        <g transform="translate(${left} ${top}) scale(${width / 100} ${height / 100})">${surface}<rect class="region-grain" width="100" height="100" filter="url(#${id}-grain)"/></g>
      </g>
      <g class="region-boundaries">${states.map(s => `<path class="region-state" d="${s.path}"/>`).join('')}</g>
    </svg>`;
  }
  function renderMaps() {
    const texture = '<defs><pattern id="hero-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V9" stroke="#a8a487" stroke-width="1"/></pattern></defs>';
    $('#intro-map').innerHTML = mapSvg(statePaths() + `<path class="map-hatch" d="${maps.outline}"/><path class="map-outline" d="${maps.outline}"/>`, '', texture);
    updateBiomeMap();
  }
  function updateBiomeMap() {
    const current = data.biomes.find(b => b.id === selectedBiome);
    const codes = data.biomes.map(b => b.code);
    const paths = maps.biomes.map(b => `<path class="biome${codes.includes(b.code) ? ' tracked' : ''}${b.code === current.code ? ' selected' : ''}" d="${b.path}"><title>${b.name}</title></path>`).join('');
    const labels = '<g text-anchor="middle"><text class="biome-label" x="256" y="168">AMAZÔNIA</text><text class="biome-label" x="364" y="288">CERRADO</text><text class="biome-label" x="450" y="434"><tspan x="450">MATA</tspan><tspan x="450" dy="31">ATLÂNTICA</tspan></text></g>';
    const arrows = '<g class="moisture-flow" aria-hidden="true"><path d="M322 99C251 86 144 130 159 208"/><path d="M190 223C205 294 294 357 390 380"/><path d="M166 245C174 335 267 398 286 476"/></g>';
    const marker = '<defs><marker id="moisture-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M1 1 5 3.5 1 6" fill="none" stroke="#dbebdf" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    $('#forest-map').innerHTML = mapSvg(paths + arrows + labels, `Biomas do Brasil, com ${current.name} em destaque. Setas esquemáticas mostram o transporte de umidade pela Amazônia em direção ao Centro-Oeste, Sudeste e Sul.`, marker);
    $('#biome-caption-name').textContent = current.name;
    document.querySelectorAll('.biome-row').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.biome === selectedBiome)));
  }
  function renderResults() {
    const m = data.meta;
    $('#forest-intro').textContent = result.forestAvailable
      ? (result.forestPartial ? `Você nasceu em ${result.birth}. Usamos a vegetação de ${result.forestReferenceYear}, o primeiro ano disponível, como referência para medir a perda posterior.` : `Da vegetação que existia em ${result.birth}, ano em que você nasceu, foi desmatado até agora:`)
      : `Você nasceu em ${result.birth}. Ainda não temos um período posterior a esse ano para calcular a perda.`;
    const forestPeriod = $('#forest-period');
    forestPeriod.hidden = result.forestAvailable && !result.forestPartial;
    forestPeriod.textContent = !result.forestAvailable
      ? `Último ano disponível: ${m.forestEnd}. Falta de dados não significa desmatamento zero.`
      : result.forestPartial
        ? `Vegetação de referência: ${result.forestReferenceYear}. Desmatamento: ${result.forestStart}–${m.forestEnd}. A série não cobre toda a sua vida.`
        : '';
    $('#map-period').textContent = result.forestAvailable ? `${result.forestReferenceYear} → ${m.forestEnd}` : `DADOS ATÉ ${m.forestEnd}`;
    $('#biome-results').innerHTML = result.biomes.map(b => {
      const value = b.percent === null ? 'Sem dados' : `${b.percent > 0 && b.percent < 0.01 ? '&lt; 0,01' : percentFormat.format(b.percent)}<small>%</small>`;
      const caption = b.lossHa === null ? 'Período ainda não observado' : `${compact(b.lossHa / 100)} km² de vegetação primária desmatada`;
      return `<button class="biome-row" data-biome="${b.id}" aria-pressed="${b.id === selectedBiome}"><span><span class="biome-name">${b.name}</span><span class="biome-area">${caption}</span></span><span class="biome-percent${b.percent === null ? ' no-data' : ''}">${value}</span></button>`;
    }).join('');
    $('#water-intro').textContent = 'Veja quanto mudou a média anual de registros de enchentes e secas nos municípios.';
    $('#water-period').textContent = `Comparação: ${m.baselineStart}–${m.baselineEnd} e ${m.comparisonStart}–${m.comparisonEnd}. Os mesmos períodos para todos os anos de nascimento.`;
    $('#disaster-results').innerHTML = result.disasters.map(r => {
      const maximum = Math.max(r.mean || 0, r.baselineMean, 1);
      const meanLabel = r.mean === null ? 'Sem dados' : decimal.format(r.mean);
      const period = `${m.comparisonStart}–${m.comparisonEnd}`;
      const changeLabel = r.changePercent === null ? 'Sem comparação' : `${r.changePercent > 0 ? '+' : ''}${decimal.format(r.changePercent)}<small>%</small>`;
      const direction = r.changePercent > 0 ? 'aumento' : r.changePercent < 0 ? 'redução' : 'sem alteração';
      return `<article class="disaster-card ${r.kind === 'drought' ? 'drought' : ''}">
        <header><p class="event-kind">${r.kind === 'drought' ? 'Secas & estiagens' : 'Enchentes'}</p><h3>${r.region}</h3></header>
        <div class="region-stamp" aria-hidden="true">${regionMap(r.region)}</div>
        <p class="event-count${r.changePercent === null ? ' no-data' : ''}">${changeLabel}</p>
        <p class="event-caption">${r.changePercent === null ? 'Base de comparação indisponível.' : `${direction} na média de registros municipais da década de 90 pra <span class="event-period">${period}</span>`}</p>
        <div class="annual-comparison"><p class="annual-label">Registros por ano · média</p>
          <div class="comparison-row baseline"><div class="comparison-label"><span>${m.baselineStart}–${m.baselineEnd}</span><strong>${decimal.format(r.baselineMean)}</strong></div><div class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${r.baselineMean / maximum * 100}%"></span></div></div>
          <div class="comparison-row"><div class="comparison-label"><span>${period}</span><strong>${meanLabel}</strong></div>${r.mean === null ? '' : `<div class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${r.mean / maximum * 100}%"></span></div>`}</div>
        </div></article>`;
    }).join('');
    updateBiomeMap();
  }
  function goTo(index, setHash = true, focus = true) {
    if (!Number.isInteger(index) || index < 0 || index > 3 || (index && !result)) return;
    currentScene = index;
    sceneIds.forEach((id, i) => {
      const section = document.getElementById(id);
      section.hidden = i !== index;
    });
    document.querySelectorAll('.chapter-nav button').forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = i !== 0 && !result;
    });
    document.title = index === 0 ? 'Quanto desmatamento desde que eu nasci?' : `${sceneNames[index]} · Desde que eu nasci`;
    if (setHash && location.hash !== `#${sceneIds[index]}`) history.pushState(null, '', `#${sceneIds[index]}`);
    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const title = document.querySelector(`#${sceneIds[index]} h1, #${sceneIds[index]} h2`);
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
    $('#app-status').textContent = `Etapa ${index + 1} de 4: ${sceneNames[index]}.`;
  }
  const dialog = $('#sources-dialog');
  let sourceTrigger;
  function closeSources() { dialog.close(); }
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; sourceTrigger?.focus(); });
  $('#close-sources').addEventListener('click', closeSources);
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSources();
  } });
  document.addEventListener('click', event => {
    const source = event.target.closest('[data-sources]');
    if (source) { sourceTrigger = source; dialog.showModal(); document.body.style.overflow = 'hidden'; return; }
    const nav = event.target.closest('[data-go]');
    if (nav && !nav.disabled) goTo(Number(nav.dataset.go));
    const biome = event.target.closest('[data-biome]');
    if (biome) { selectedBiome = biome.dataset.biome; updateBiomeMap(); }
  });
  $('.wordmark').addEventListener('click', event => { event.preventDefault(); goTo(0); });
  window.addEventListener('popstate', () => {
    const index = sceneIds.indexOf(location.hash.slice(1));
    goTo(index > 0 && result ? index : 0, false);
  });
  input.addEventListener('input', () => { $('#year-error').textContent = ''; input.removeAttribute('aria-invalid'); });
  $('#birth-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!data || !maps || !math) return;
    const year = input.value.trim();
    if (!math.validYear(year)) {
      $('#year-error').textContent = `Digite um ano entre 1960 e ${input.max}.`;
      input.setAttribute('aria-invalid', 'true'); input.focus(); return;
    }
    result = math.summarize(data, year);
    renderResults();
    goTo(1);
  });
  if (!data || !maps || !math) {
    $('#year-error').textContent = 'Não foi possível carregar os dados. Recarregue a página para tentar novamente.';
    return;
  }
  try {
    renderMaps();
    $('#source-date').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(data.meta.preparedAt + 'T12:00:00Z'));
    $('#start-button').disabled = false;
    goTo(0, false, false);
  } catch (error) {
    $('#year-error').textContent = 'Os dados não carregaram por completo. Recarregue a página para tentar novamente.';
    console.error(error);
  }
})();

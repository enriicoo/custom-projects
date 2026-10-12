(function (root) {
  'use strict';
  function validYear(value, max = new Date().getFullYear()) {
    return /^\d{4}$/.test(String(value)) && Number(value) >= 1960 && Number(value) <= max;
  }
  function sumYears(series, start, end) {
    let total = 0;
    for (let year = start; year <= end; year++) {
      if (!Object.hasOwn(series, year) || !Number.isFinite(series[year])) {
        throw new Error(`Série incompleta: ${year}`);
      }
      total += series[year];
    }
    return total;
  }
  function summarize(data, birthYear) {
    if (!validYear(birthYear)) throw new Error('Ano de nascimento inválido.');
    const birth = Number(birthYear), m = data.meta;
    const forestReferenceYear = Math.max(birth, m.forestStart);
    const forestStart = forestReferenceYear + 1;
    const disasterStart = m.comparisonStart;
    const forestAvailable = forestStart <= m.forestEnd;
    const disasterAvailable = m.comparisonEnd <= m.disasterEnd;
    return {
      birth, forestReferenceYear, forestStart, disasterStart, forestAvailable, disasterAvailable,
      forestPartial: birth < m.forestStart,
      biomes: data.biomes.map(b => {
        const lossHa = forestAvailable ? sumYears(b.primaryHa, forestStart, m.forestEnd) : null;
        const referenceHa = forestAvailable ? sumYears(b.standingPrimaryHa, forestReferenceYear, forestReferenceYear) : null;
        if (forestAvailable && referenceHa <= 0) throw new Error('Área de referência inválida.');
        return { ...b, lossHa, referenceHa, percent: lossHa === null ? null : lossHa / referenceHa * 100 };
      }),
      disasters: [['Sul', 'flood'], ['Sudeste', 'flood'], ['Nordeste', 'drought']].map(([region, kind]) => {
        const series = data.disasters[region][kind];
        const count = disasterAvailable ? sumYears(series, disasterStart, m.comparisonEnd) : null;
        const baselineCount = sumYears(series, m.baselineStart, m.baselineEnd);
        const mean = count === null ? null : count / (m.comparisonEnd - disasterStart + 1);
        const baselineMean = baselineCount / (m.baselineEnd - m.baselineStart + 1);
        return { region, kind, count,
          mean, baselineMean,
          changePercent: mean === null || baselineMean === 0 ? null : (mean / baselineMean - 1) * 100 };
      })
    };
  }
  const api = { validYear, sumYears, summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ClimateMath = api;
})(typeof window === 'undefined' ? globalThis : window);

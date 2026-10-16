export const communities = [
  {
    id: 'dortmund',
    name: 'Dortmund',
    region: 'Ruhrgebiet · Nordrhein-Westfalen',
    kind: 'Energy Sharing · Ort',
    description: 'Stadtweite Energiegemeinschaft mit mehreren Erzeugern und Haushalten.',
    prefix: '44',
    center: [51.5136, 7.4653],
    zoom: 12,
    members: 32,
    plants: 7,
    sites: [
      { name: 'Bürgersolarpark Hörde', position: [51.4889, 7.4989], role: 'producer', power: 148 },
      { name: 'Dachanlage Kreuzviertel', position: [51.5062, 7.4518], role: 'producer', power: 36 },
      { name: 'Quartier Nordmarkt', position: [51.5248, 7.4582], role: 'consumer', power: 0 },
      { name: 'Gewerbehof Hafen', position: [51.5321, 7.4421], role: 'both', power: 62 },
    ],
  },
  {
    id: 'grupenhagen',
    name: 'Grupenhagen',
    region: 'Aerzen · Niedersachsen',
    kind: 'Mieterstrom · Ortschaft',
    description: 'Dorfgemeinschaft mit Mieterstrom und gemeinsamer Einspeisung.',
    prefix: '318',
    center: [52.0255, 9.2186],
    zoom: 13,
    members: 14,
    plants: 3,
    sites: [
      { name: 'Hofanlage Grupenhagen', position: [52.0268, 9.2201], role: 'producer', power: 84 },
      { name: 'Mehrfamilienhaus Dorfstraße', position: [52.0241, 9.2152], role: 'both', power: 18 },
      { name: 'Gemeindehaus', position: [52.0229, 9.2228], role: 'consumer', power: 0 },
    ],
  },
];

export const periods = [
  { id: 'day', label: 'Heute', points: 24, unit: 'Uhr', factor: 1 },
  { id: 'week', label: '7 Tage', points: 7, unit: 'Tag', factor: 6.4 },
  { id: 'month', label: '30 Tage', points: 30, unit: 'Tag', factor: 27 },
  { id: 'year', label: 'Jahr', points: 12, unit: 'Monat', factor: 320 },
];

function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function curve(index, points, random) {
  const position = index / Math.max(1, points - 1);
  const solar = Math.max(0, Math.sin(Math.PI * position) ** 1.6);
  return solar * 0.8 + random() * 0.35;
}

export function series(community, period, offset = 0) {
  const spec = periods.find((p) => p.id === period) ?? periods[0];
  const random = seeded(community.id.length * 7919 + spec.points * 104729 + offset);
  const base = community.plants * 9.4 * spec.factor;
  return Array.from({ length: spec.points }, (_, index) => {
    const fed = Number((curve(index, spec.points, random) * base).toFixed(1));
    const used = Number((fed * (0.72 + random() * 0.55)).toFixed(1));
    const label =
      spec.id === 'day'
        ? `${String(index).padStart(2, '0')}:00`
        : spec.id === 'year'
          ? ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][index]
          : `${index + 1}.`;
    return { label, fed, used };
  });
}

export function totals(rows) {
  const fed = rows.reduce((sum, row) => sum + row.fed, 0);
  const used = rows.reduce((sum, row) => sum + row.used, 0);
  const covered = rows.reduce((sum, row) => sum + Math.min(row.fed, row.used), 0);
  return {
    fed: Math.round(fed),
    used: Math.round(used),
    autarky: used > 0 ? Math.min(100, Math.round((covered / used) * 100)) : 0,
    grid: Math.max(0, Math.round(used - covered)),
  };
}

export function personal(rows, share) {
  const fed = Math.round(rows.reduce((sum, row) => sum + row.fed, 0) * share.fed);
  const used = Math.round(rows.reduce((sum, row) => sum + row.used, 0) * share.used);
  return {
    fed,
    used,
    earnings: Number((fed * 0.31).toFixed(2)),
    costs: Number((used * 0.28).toFixed(2)),
  };
}

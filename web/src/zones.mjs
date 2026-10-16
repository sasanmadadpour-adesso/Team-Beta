// Teilt die Fläche einer Community in aneinandergrenzende Bereiche auf.
// Jeder Teilnehmer erhält eine eigene Zone; die Zonen teilen sich die Grenzen.

function split(items, rect, horizontal) {
  if (items.length === 1) return [{ ...items[0], rect }];

  const total = items.reduce((sum, item) => sum + item.weight, 0) || items.length;
  let running = 0;
  let cut = 1;
  for (let index = 0; index < items.length - 1; index += 1) {
    running += items[index].weight;
    if (running >= total / 2) {
      cut = index + 1;
      break;
    }
  }

  const head = items.slice(0, cut);
  const tail = items.slice(cut);
  const headWeight = head.reduce((sum, item) => sum + item.weight, 0) || head.length;
  const ratio = Math.min(0.82, Math.max(0.18, headWeight / total));

  if (horizontal) {
    const edge = rect.x0 + (rect.x1 - rect.x0) * ratio;
    return [
      ...split(head, { ...rect, x1: edge }, !horizontal),
      ...split(tail, { ...rect, x0: edge }, !horizontal),
    ];
  }

  const edge = rect.y0 + (rect.y1 - rect.y0) * ratio;
  return [
    ...split(head, { ...rect, y1: edge }, !horizontal),
    ...split(tail, { ...rect, y0: edge }, !horizontal),
  ];
}

const corners = (rect) => [
  [rect.y0, rect.x0],
  [rect.y0, rect.x1],
  [rect.y1, rect.x1],
  [rect.y1, rect.x0],
];

export function zones(community) {
  const center = community.position ?? { lat: 51.5, lon: 7.46 };
  const height = 0.0135;
  const width = height * 1.9;
  const area = {
    x0: center.lon - width / 2,
    x1: center.lon + width / 2,
    y0: center.lat - height / 2,
    y1: center.lat + height / 2,
  };

  const plantDemand = Math.max(1, community.plant.capacity);
  const items = [
    {
      key: 'plant',
      name: `${community.plant.type}anlage`,
      kind: 'plant',
      detail: `${community.plant.capacity} kW installiert`,
      weight: plantDemand * 1.5,
      participates: true,
    },
    ...community.households.map((household, position) => ({
      key: household.melo,
      name: `Haushalt ${position + 1}`,
      kind: household.participates ? 'member' : 'excluded',
      detail: household.participates ? `MK7 · PLZ ${household.zip}` : 'Nimmt nicht an MK7 teil',
      weight: Math.max(0.4, household.consumption.reduce((sum, value) => sum + value, 0)),
      participates: household.participates,
    })),
  ];

  return split(items, area, true).map((item) => ({
    ...item,
    polygon: corners(item.rect),
    center: [(item.rect.y0 + item.rect.y1) / 2, (item.rect.x0 + item.rect.x1) / 2],
  }));
}

export const zoneStyle = {
  plant: { color: '#0f6f58', fill: '#21a582' },
  member: { color: '#1b7fb8', fill: '#4fa8d8' },
  excluded: { color: '#9aa8ae', fill: '#c3cdd2' },
};

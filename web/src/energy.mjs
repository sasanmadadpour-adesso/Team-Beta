// Bilanzierung und Zahlungen exakt nach Blatt "Zahlungsregeln" des Datensatzes.
import dataset from './data.json';

export const hours = dataset.hours;
export const rules = dataset.rules;
export const window = dataset.window;

const round = (value, digits = 2) => Number(value.toFixed(digits));
const sum = (values) => values.reduce((total, value) => total + value, 0);

export const communities = dataset.communities.map((community) => {
  const eligible = community.households.filter((household) => household.participates);
  return {
    ...community,
    eligible,
    name: community.city,
    label: `${community.address}, ${community.zip} ${community.city}`,
  };
});

export function findCommunity(id) {
  return communities.find((community) => community.id === id) ?? communities[0];
}

// Je Stunde: lokal zugeteilt = MIN(Erzeugung, berechtigter Verbrauch),
// Reststrom = MAX(0, Verbrauch - Erzeugung), Einspeisung = MAX(0, Erzeugung - Verbrauch).
export function balance(community) {
  return hours.map((hour, index) => {
    const generated = community.plant.generation[index] ?? 0;
    const demand = sum(community.eligible.map((household) => household.consumption[index] ?? 0));
    const local = Math.min(generated, demand);
    return {
      index,
      start: hour.start,
      time: new Date(hour.start).toUTCString().slice(17, 22),
      generated: round(generated, 3),
      demand: round(demand, 3),
      local: round(local, 3),
      residual: round(Math.max(0, demand - generated), 3),
      exported: round(Math.max(0, generated - demand), 3),
    };
  });
}

export function range(rows, span) {
  if (span === 'day') return rows;
  const size = span === 'q6' ? 6 : span === 'q12' ? 12 : rows.length;
  const out = [];
  for (let start = 0; start < rows.length; start += size) {
    const slice = rows.slice(start, start + size);
    out.push({
      index: out.length,
      time: `${slice[0].time}–${slice[slice.length - 1].time}`,
      generated: round(sum(slice.map((r) => r.generated)), 2),
      demand: round(sum(slice.map((r) => r.demand)), 2),
      local: round(sum(slice.map((r) => r.local)), 2),
      residual: round(sum(slice.map((r) => r.residual)), 2),
      exported: round(sum(slice.map((r) => r.exported)), 2),
    });
  }
  return out;
}

export function totals(rows) {
  const generated = sum(rows.map((row) => row.generated));
  const demand = sum(rows.map((row) => row.demand));
  const local = sum(rows.map((row) => row.local));
  return {
    generated: round(generated),
    demand: round(demand),
    local: round(local),
    residual: round(sum(rows.map((row) => row.residual))),
    exported: round(sum(rows.map((row) => row.exported))),
    autarky: demand > 0 ? Math.round((local / demand) * 100) : 0,
  };
}

// Anteilige Zuteilung nach Stundenverbrauch; Nichtteilnehmer bleiben ausgeschlossen.
export function household(community, melo) {
  const rows = balance(community);
  const member = community.households.find((item) => item.melo === melo);
  if (!member) return null;

  const detail = rows.map((row, index) => {
    const own = member.consumption[index] ?? 0;
    const share = row.demand > 0 ? own / row.demand : 0;
    const local = member.participates ? row.local * share : 0;
    return {
      ...row,
      own: round(own, 3),
      localShare: round(local, 3),
      residualShare: round(Math.max(0, own - local), 3),
      cost: round(own * hours[index].sale, 4),
    };
  });

  const consumed = sum(detail.map((row) => row.own));
  return {
    melo: member.melo,
    participates: member.participates,
    zip: member.zip,
    detail,
    consumed: round(consumed),
    local: round(sum(detail.map((row) => row.localShare))),
    residual: round(sum(detail.map((row) => row.residualShare))),
    // Stromrechnung: Gesamtverbrauch × fester Verkaufspreis, kein Grundpreis.
    cost: round(sum(detail.map((row) => row.cost))),
    autarky: consumed > 0 ? Math.round((sum(detail.map((r) => r.localShare)) / consumed) * 100) : 0,
  };
}

// Zahlungen laut Regelwerk; Mieterstromzuschlag nur für Solar.
export function payments(community) {
  const rows = balance(community);
  const solar = String(community.plant.type).toLowerCase().startsWith('solar');

  const purchase = sum(rows.map((row, i) => row.local * hours[i].purchase));
  const residual = sum(rows.map((row, i) => row.residual * hours[i].spot));
  const feedIn = sum(rows.map((row, i) => row.exported * hours[i].feedIn));
  const bonus = solar ? sum(rows.map((row, i) => row.local * hours[i].bonus)) : 0;
  const billing = sum(
    community.eligible.map((member) =>
      sum(member.consumption.map((value, i) => value * hours[i].sale)),
    ),
  );
  const metering = community.eligible.length * (hours[0]?.meterFee ?? 0);

  return {
    solar,
    supplier: hours[0]?.supplier ?? '',
    gridOperator: hours[0]?.gridOperator ?? '',
    meterOperator: hours[0]?.meterOperator ?? '',
    meters: community.eligible.length,
    items: [
      { label: 'Stromrechnung der Teilnehmer', payer: 'Berechtigte Teilnehmer', receiver: 'Mieterstromlieferant', amount: round(billing) },
      { label: 'Ankauf lokalen Stroms', payer: 'Mieterstromlieferant', receiver: 'Anlagenbetreiber', amount: round(purchase) },
      { label: 'Beschaffung von Reststrom', payer: 'Mieterstromlieferant', receiver: hours[0]?.supplier ?? '', amount: round(residual) },
      { label: 'Einspeisevergütung', payer: hours[0]?.gridOperator ?? '', receiver: 'Anlagenbetreiber', amount: round(feedIn) },
      { label: 'Mieterstromzuschlag', payer: hours[0]?.gridOperator ?? '', receiver: 'Anlagenbetreiber', amount: round(bonus), note: solar ? '' : 'Entfällt: nur für Solarstrom' },
      { label: 'Messstellenbetrieb (24 h)', payer: 'Mieterstromlieferant', receiver: hours[0]?.meterOperator ?? '', amount: round(metering) },
    ],
    operatorIncome: round(purchase + feedIn + bonus),
    supplierBalance: round(billing - purchase - residual - metering),
  };
}

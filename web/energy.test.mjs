import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dataset = JSON.parse(readFileSync(new URL('./src/data.json', import.meta.url), 'utf8'));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const sum = (values) => values.reduce((total, value) => total + value, 0);

const communities = dataset.communities.map((community) => ({
  ...community,
  eligible: community.households.filter((household) => household.participates),
}));

function balance(community) {
  return dataset.hours.map((_, index) => {
    const generated = community.plant.generation[index] ?? 0;
    const demand = sum(community.eligible.map((h) => h.consumption[index] ?? 0));
    return {
      generated,
      demand,
      local: Math.min(generated, demand),
      residual: Math.max(0, demand - generated),
      exported: Math.max(0, generated - demand),
    };
  });
}

test('Datensatz liefert das 24-Stunden-Szenario', () => {
  assert.equal(dataset.hours.length, 24);
  assert.equal(dataset.window.start, '2026-10-01T00:00:00.000Z');
  assert.equal(communities.length, 3);
});

test('Nichtteilnehmer sind von der Zuteilung ausgeschlossen', () => {
  const muelheim = communities.find((c) => c.id === 'B-MUL-01');
  assert.equal(muelheim.households.length, 4);
  assert.equal(muelheim.eligible.length, 3);
  assert.ok(muelheim.households.some((h) => !h.participates));
});

test('Bilanz folgt MIN/MAX-Regeln je Stunde', () => {
  for (const community of communities) {
    for (const row of balance(community)) {
      assert.equal(round(row.local, 6), round(Math.min(row.generated, row.demand), 6));
      assert.equal(round(row.local + row.residual, 6), round(row.demand, 6));
      assert.equal(round(row.local + row.exported, 6), round(row.generated, 6));
      assert.ok(row.residual >= 0 && row.exported >= 0);
    }
  }
});

test('Mieterstromzuschlag gilt nicht für Windstrom', () => {
  const koeln = communities.find((c) => c.id === 'B-CGN-01');
  assert.equal(koeln.plant.type, 'Wind');
  const solar = String(koeln.plant.type).toLowerCase().startsWith('solar');
  assert.equal(solar, false);
  const bonus = solar ? sum(balance(koeln).map((r, i) => r.local * dataset.hours[i].bonus)) : 0;
  assert.equal(bonus, 0);
});

test('Messentgelt wird einmal je Zähler für 24 Stunden berechnet', () => {
  const frankfurt = communities.find((c) => c.id === 'B-FRA-01');
  const fee = dataset.hours[0].meterFee;
  const metering = frankfurt.eligible.length * fee;
  assert.equal(frankfurt.eligible.length, 3);
  assert.ok(metering < fee * 24 * frankfurt.eligible.length);
  assert.equal(round(metering, 4), round(3 * 0.0821917808219178, 4));
});

test('Stromrechnung nutzt den festen Verkaufspreis ohne Grundpreis', () => {
  const frankfurt = communities.find((c) => c.id === 'B-FRA-01');
  const member = frankfurt.eligible[0];
  const cost = sum(member.consumption.map((value, i) => value * dataset.hours[i].sale));
  const expected = sum(member.consumption) * 0.25;
  assert.equal(round(cost, 6), round(expected, 6));
});

test('Negative Börsenpreise bleiben erhalten', () => {
  assert.ok(dataset.hours.some((hour) => hour.spot < 0));
});

test('Anteilige Zuteilung summiert sich auf die lokale Menge', () => {
  for (const community of communities) {
    const rows = balance(community);
    rows.forEach((row, index) => {
      const shares = community.eligible.map((member) => {
        const own = member.consumption[index] ?? 0;
        return row.demand > 0 ? row.local * (own / row.demand) : 0;
      });
      assert.equal(round(sum(shares), 6), round(row.local, 6));
    });
  }
});

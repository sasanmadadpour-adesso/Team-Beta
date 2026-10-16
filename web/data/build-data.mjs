// Wandelt Datensatz_Deutsch.xlsx in src/data.json um.
// Aufruf: node data/build-data.mjs   (benötigt: npm i -D xlsx)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const source = fileURLToPath(new URL('../../Datensatz_Deutsch.xlsx', import.meta.url));
const target = fileURLToPath(new URL('../src/data.json', import.meta.url));
const book = XLSX.readFile(source);
const sheet = (name) => XLSX.utils.sheet_to_json(book.Sheets[name], { defval: '' });

const toIso = (serial) =>
  typeof serial === 'number'
    ? new Date(Math.round((serial - 25569) * 86400) * 1000).toISOString()
    : String(serial);

const yes = (value) => String(value).trim().toLowerCase() === 'ja';
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const producers = sheet('Erzeuger Registrierung');
const participants = sheet('MK7 Teilnehmer');
const consumption = sheet('Stündlicher Verbrauch');
const generation = sheet('Stündliche Erzeugung');
const pricing = sheet('Strompreise');
const rules = sheet('Zahlungsregeln');

const hours = pricing
  .map((row) => ({
    start: toIso(row.beginn_utc),
    end: toIso(row.ende_utc),
    spot: num(row.boersenpreis_eur_kwh),
    sale: num(row.verkaufspreis_eur_kwh),
    purchase: num(row.anlagenankaufspreis_eur_kwh),
    feedIn: num(row.einspeiseverguetung_eur_kwh),
    bonus: num(row.mieterstromzuschlag_eur_kwh),
    meterFee: num(row.messentgelt_eur_je_zaehler_24h),
    supplier: row.reststromlieferant,
    gridOperator: row.netzbetreiber,
    meterOperator: row.messstellenbetreiber,
  }))
  .sort((a, b) => a.start.localeCompare(b.start));

const index = new Map(hours.map((hour, position) => [hour.start, position]));

const series = (rows, key, idField) => {
  const out = new Map();
  for (const row of rows) {
    const position = index.get(toIso(row.beginn_utc));
    if (position === undefined) continue;
    const id = String(row[idField]);
    if (!out.has(id)) out.set(id, new Array(hours.length).fill(0));
    out.get(id)[position] = num(row[key]);
  }
  return out;
};

const consumptionByMelo = series(consumption, 'verbrauch_kwh', 'messlokation_id_MeLo');
const generationByBuilding = series(generation, 'erzeugung_kwh', 'gebaeude_id');

const generationMeta = new Map();
for (const row of generation) {
  generationMeta.set(row.gebaeude_id, {
    type: row.erzeugungsart,
    capacity: num(row.anlagenleistung_kw),
    marketLocation: String(row.marktlokation_id_MaLo),
  });
}

const buildings = new Map();
for (const row of participants) {
  const id = row.gebaeude_id;
  if (!buildings.has(id)) {
    buildings.set(id, {
      id,
      city: row.stadt,
      operator: row.mk7_betreiber,
      address: String(row.strassenadresse).replace(/\s+/g, ' ').trim(),
      zip: String(row.stadt_postleitzahl).match(/\d{5}/)?.[0] ?? '',
      meterOperator: row.messstellenbetreiber,
      meteringSystem: row.messsystem,
      households: [],
      roles: [],
    });
  }
  const building = buildings.get(id);
  const role = String(row.mk7_rolle).trim();
  building.roles.push({
    role,
    melo: String(row.messlokation_id_MeLo),
    participates: yes(row['Teilnahme MK7']),
    zip: String(row.stadt_postleitzahl).match(/\d{5}/)?.[0] ?? '',
  });
  if (role === 'Haushaltsverbrauch') {
    building.households.push({
      melo: String(row.messlokation_id_MeLo),
      marketLocation: String(row.marktlokation_id_bezug_MaLo),
      participates: yes(row['Teilnahme MK7']),
      zip: String(row.stadt_postleitzahl).match(/\d{5}/)?.[0] ?? '',
      consumption: consumptionByMelo.get(String(row.messlokation_id_MeLo)) ?? new Array(hours.length).fill(0),
    });
  }
}

const coordinates = new Map(
  producers.map((row) => [
    row.building_id,
    { lat: num(row['plant_specifics.latitude']), lon: num(row['plant_specifics.longitude']) },
  ]),
);

const owners = new Map(
  producers.map((row) => [
    row.building_id,
    {
      firstName: row.first_name,
      lastName: row.last_name,
      email: String(row.email).toLowerCase(),
      salutation: row.salutation,
      isBusiness: String(row.is_business) === 'true',
      isReverseCharge: String(row.is_reverse_charge) === 'true',
      street: String(row.deliv_address_street).replace(/\s+/g, ' ').trim(),
      houseNumber: String(row.deliv_address_house_number),
      zip: String(row.deliv_address_zipcode),
      city: row.deliv_address_city,
      productName: row.product_name,
      customerId: row.saas_customer_id,
      contractId: row.saas_contract_id,
      contractStart: toIso(row.contract_start_utc),
      contractEnd: toIso(row.contract_end_utc),
      marketLocation: String(row.market_location_identifier),
    },
  ]),
);

const output = {
  generatedFrom: 'Datensatz_Deutsch.xlsx',
  window: { start: hours[0]?.start, end: hours.at(-1)?.end, hours: hours.length },
  hours,
  rules: rules.map((row) => ({
    area: row.bereich,
    position: row.position,
    payer: row.zahler,
    receiver: row.empfaenger,
    priceColumn: row.preisspalte,
    rule: row.berechnung_oder_regel,
  })),
  communities: [...buildings.values()].map((building) => {
    const meta = generationMeta.get(building.id) ?? { type: 'Unbekannt', capacity: 0 };
    return {
      ...building,
      plant: {
        ...meta,
        generation: generationByBuilding.get(building.id) ?? new Array(hours.length).fill(0),
      },
      position: coordinates.get(building.id) ?? null,
      owner: owners.get(building.id) ?? null,
    };
  }),
};

writeFileSync(target, JSON.stringify(output));
console.log(
  `data.json geschrieben: ${output.communities.length} Communities, ${hours.length} Stunden, ${output.rules.length} Regeln.`,
);

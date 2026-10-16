const latin1 = (text) =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00b7/g, '-')
    .replace(/\u20ac/g, 'EUR');

const escape = (text) => latin1(text).replace(/([\\()])/g, '\\$1');

function bytes(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function line(size, font, x, y, text) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escape(text)}) Tj ET\n`;
}

function rule(y) {
  return `0.86 0.91 0.93 rg 56 ${y} 483 1 re f\n`;
}

export function invoiceDocument(invoice) {
  const rows = [
    ['Einspeisung', `${invoice.fed} kWh`],
    ['Verguetung Einspeisung', `${invoice.earnings.toFixed(2)} EUR`],
    ['Bezug aus der Community', `${invoice.used} kWh`],
    ['Kosten Bezug', `- ${invoice.costs.toFixed(2)} EUR`],
  ];

  let content = '';
  content += '0.04 0.19 0.25 rg\n';
  content += line(22, 'F2', 56, 760, 'Abrechnung');
  content += '0.39 0.51 0.56 rg\n';
  content += line(11, 'F1', 56, 742, `${invoice.month} - Community ${invoice.community}`);
  content += rule(728);

  content += '0.04 0.19 0.25 rg\n';
  content += line(10, 'F2', 56, 700, 'EMPFAENGER');
  content += '0.24 0.36 0.42 rg\n';
  content += line(11, 'F1', 56, 684, invoice.name);
  content += line(11, 'F1', 56, 668, invoice.email);
  content += line(11, 'F1', 56, 652, invoice.location);

  content += '0.04 0.19 0.25 rg\n';
  content += line(10, 'F2', 330, 700, 'BELEG');
  content += '0.24 0.36 0.42 rg\n';
  content += line(11, 'F1', 330, 684, `Nummer: ${invoice.number}`);
  content += line(11, 'F1', 330, 668, `Zeitraum: ${invoice.month}`);
  content += line(11, 'F1', 330, 652, `Anlage: ${invoice.plant}`);

  content += rule(630);
  content += '0.04 0.19 0.25 rg\n';
  content += line(10, 'F2', 56, 606, 'POSITION');
  content += line(10, 'F2', 430, 606, 'WERT');
  content += rule(596);

  let y = 572;
  content += '0.24 0.36 0.42 rg\n';
  for (const [label, value] of rows) {
    content += line(11, 'F1', 56, y, label);
    content += line(11, 'F1', 430, y, value);
    y -= 26;
  }

  content += rule(y + 6);
  content += '0.09 0.53 0.42 rg\n';
  content += line(14, 'F2', 56, y - 24, 'Gutschrift gesamt');
  content += line(14, 'F2', 430, y - 24, `${invoice.total.toFixed(2)} EUR`);

  content += '0.45 0.55 0.60 rg\n';
  content += line(9, 'F1', 56, 120, 'Demo-Beleg aus dem Prototyp Adesso.App 1.');
  content += line(9, 'F1', 56, 106, 'Keine rechtsgueltige Rechnung. Echte Belege folgen aus der Abrechnung des Direktvermarkters.');

  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>',
    `<</Length ${content.length}>>\nstream\n${content}endstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const start = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${start}\n%%EOF`;

  return bytes(pdf);
}

export function invoiceBlob(invoice) {
  return new Blob([invoiceDocument(invoice)], { type: 'application/pdf' });
}

export function downloadInvoice(invoice) {
  const blob = invoiceBlob(invoice);
  const name = `Abrechnung-${invoice.month.replace(/\s+/g, '-')}.pdf`;

  if (location.protocol === 'file:') {
    const reader = new FileReader();
    reader.onload = () => {
      const link = document.createElement('a');
      link.href = reader.result;
      link.download = name;
      link.click();
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

# Energy Onboarding – React-Prototyp

## Lokal starten

Node.js 22.9+ und npm erforderlich.

1. `npm ci`
2. `npm run build`
3. `npm start`
4. http://127.0.0.1:3000 öffnen.

`npm run dev` beobachtet die React-Quelldateien und baut Änderungen neu. Den Server parallel starten und den Browser nach Änderungen neu laden. `npm test` führt zehn automatisierte Tests aus. Die lokalen Buildartefakte und node_modules sind von Git ausgeschlossen; package-lock.json ist eingecheckt.

## Umgesetzter Ablauf

Fünf Formularschritte: Anlage, Kontakt, Standort/Start, Bank/SEPA und Prüfung. Stepper, Zurück und Bearbeiten erhalten Angaben im React-State. Reverse Charge nur für Geschäftskunden; der Wechsel zu Privat setzt den Wert zurück, der Server weist widersprüchliche Werte ab. Bankdaten mit IBAN-Prüfsumme, optionale BIC, Kontobestätigung, Auszahlung oder SEPA-Vorbereitung. Keine verbindliche Mandatserteilung.

Nach erfolgreicher Demo- oder Sandboxregistrierung folgt die Ersteinrichtung: Community Dortmund oder Grupenhagen auswählen, Auswahl bestätigen, Übersicht mit Anlage, Registrierungsstatus, Bankstatus und nächsten Schritten. Die regionale Orientierung nutzt Ortsname/PLZ-Präfix, keine Entfernungsberechnung. Die Communities wurden vom Nutzer vorgegeben; es gibt keine Live-Mitgliederdaten oder Community-API.

Die Gestaltung orientiert sich an adesso, mit eigener Energieillustration und neutraler Marke. Kein offizieller adesso-Auftritt, keine übernommenen Fotos.

## Daten und Integration

Ohne Testzugangsdaten ist die Anwendung eine deutlich markierte lokale Demo. Keine Daten gehen beim Tippen an den Server. Erst Absenden sendet JSON an den lokalen Server zur Prüfung. Keine personenbezogenen Logs, keine Speicherung im Browser-Storage oder auf dem Server. Neuladen verwirft den Entwurf. Der JSON-Download enthält auf ausdrücklichen Klick die Eingaben einschließlich Bankdaten; nicht öffentlich teilen.

Für die Sandbox `.env.example` nach `.env` kopieren und lokal `LUMENAZA_CLIENT_ID` sowie `LUMENAZA_CLIENT_SECRET` eintragen, optional `LUMENAZA_PRODUCT_NAME`; Server neu starten. Secrets niemals ins Frontend, in Git oder den Chat kopieren. OAuth verwendet fest die Testumgebung `https://api.test.lumenaza.de/oauth2/token/`, Scope write, Token-Cache und einmalige Erneuerung nach 401. Producer-POST: `https://api.test.lumenaza.de/v3/producers/`. Kein Produktionsmodus implementiert. Echter API-Test mangels Zugangsdaten ausstehend.

Feldmapping gemäß dem vom Nutzer bereitgestellten Lumenaza-Dokumentationsauszug. Kontakt/Adresse, Kundentyp, Produktionsart, Registrierungsgrund, Datum, Koordinaten und MaLo-ID oder Tranche werden zugeordnet; kWp/kW werden in Wp/W umgerechnet. Startdatum: Monatserster frühestens im übernächsten Monat, Zeitzone Europe/Berlin.

**Nicht an Lumenaza weitergeleitet:** Bank/SEPA, Anlagenstatus, anzulegender Wert und DV-Schnittstelle. Im gelieferten API-Schema gibt es hierfür keine bestätigten Properties. Community-Auswahl bleibt lokal. Keine automatische Befüllung des LUOX-Rechners, kein echtes SEPA-Mandat, keine Mitgliedschaft, keine Live-Erlösberechnung. SAP/Elumina wurde nicht ohne Schnittstellendokumentation als weiteres Backend erfunden.

## Projektstruktur

- `src/App.jsx`: React-Formular und Community-Nachlauf
- `src/extra.css`, `public/style.css`: Gestaltung
- `bank.mjs`, `validation.mjs`: Prüfungen und Producer-Mapping
- `server.mjs`, `lumenaza.mjs`: lokaler API-Server und OAuth-Adapter
- `test.mjs`, `bank.test.mjs`: Tests
- `SPRINT-1.md`: Screens, Pflichtfelder, Validierungen, API-Properties und offene Integrationen

Lokaler Server auf 127.0.0.1 mit Host-/Origin-Prüfung und Requestgrößenlimit. Anfragekennungen verhindern Doppelanlagen innerhalb einer Serversitzung. Für Produktion fehlen dauerhaftes Transaktions-/Einwilligungsprotokoll, verifizierte Bank-/Mandatsintegration, Dokumente und Statusprozesse. Bei unklarer API-Antwort vor erneutem Senden den Anbieterstatus prüfen.

Quellen: https://erloesrechner.luox-energy.de/ ; https://www.adesso.de/de/ ; Nutzer-Dokumentationsauszüge zu https://docs.lumenaza.de/guides/register-producer und OAuth. Die Dokumentationswebsite war über den Webabruf nicht erreichbar.

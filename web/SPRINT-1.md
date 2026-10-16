# Sprint 1: Producer-Onboarding

## Ablauf und Abnahme

| Screen | Felder und Pflichtangaben | Validierung / API |
| --- | --- | --- |
| 1 Anlage | Status, Art, Leistung, anzulegender Wert, DV-Schnittstelle | Auswahl erforderlich; positive Leistung, Wert >= 0. `production_type`; Leistung × 1000 → `plant_specifics.capacity`. Status/Wert/DV noch ohne Mapping. |
| 2 Kontaktdaten | Kundentyp, Anrede, Vorname, Nachname, E-Mail | Privat standardmäßig; Reverse Charge ausschließlich gewerblich, Rücksetzen bei Privatwahl. `is_business`, `is_reverse_charge`, `salutation`, `first_name`, `last_name`, `email`. |
| 3 Standort | Straße, Hausnummer, PLZ, Ort, Grund, Start, MaLo oder Tranche, Koordinaten | PLZ 5 Ziffern; MaLo 11 Ziffern; genau eine Kennung; gültige Koordinaten; Start Monatserster ab übernächstem Monat. `deliv_address_*`, `subscription_reason`, `preferred_delivery_start`, `market_location_identifier` oder `tranche`, `plant_specifics.latitude/longitude`. |
| 4 Bank/SEPA | Kontoinhaber, Bank, IBAN, optionale BIC, Zahlungsoption, Kontobestätigung | IBAN Format/Länge/Mod97, BIC Format; Kontobestätigung Pflicht. SEPA-Wunsch nur bei gewählter Option bestätigen. Interne Felder `account_holder`, `bank_name`, `iban`, `bic`, `payment_method`, `bank_confirmed`, `sepa_interest`. Keine dokumentierten Lumenaza-API-Properties: nicht weitergeleitet. |
| 5 Prüfung | Zusammenfassung, Bearbeiten-Links, Zustimmung | Zustimmung zunächst leer; Änderungen setzen sie zurück. IBAN maskiert. Lokale Demo oder Sandbox-POST; Fehler bleiben im Formular. |
| Nachlauf Community | Ort/PLZ, Dortmund oder Grupenhagen, Auswahlbestätigung | Bestehende Communities laut Nutzer; Zuordnung per Ortsname/PLZ-Präfix, keine behauptete Entfernung. Auswahl erforderlich, lokale Vorschau. Keine Backend-Mitgliedschaft. |

## Backlog / aktueller Stand

- [x] React mit Node/NPM, Lockfile, reproduzierbarer Build und lokales Git-Repository.
- [x] Mehrschrittformular mit Zurück, Stepper und Bearbeiten-Links; Daten im React-State.
- [x] Browser- und Servervalidierung, insbesondere Privatkunde/Reverse Charge, IBAN, Pflichtbestätigungen.
- [x] JSON-Erzeugung und API-Transport zum lokalen Server; dokumentierte Producer-Felder an Sandbox-Adapter.
- [x] OAuth ausschließlich serverseitig; Erfolg, Ablehnung, Timeout und Demo unterscheidbar.
- [x] Community-Auswahl und anschließende Übersicht mit Anlage, Bankstatus und nächsten Schritten als sichtbarer Prototyp.
- [ ] Lumenaza-Testzugang und realer Integrationstest; API-Pflichtfelder je Anlagentyp und Produkttarif abstimmen.
- [ ] Bank-/SEPA-Endpunkt und Property-Mapping vom Backend-Team beziehen. Gläubiger-ID, Empfänger und Mandatstext ergänzen, erst dann verbindliches Mandat.
- [ ] Feldmapping für Anlagenstatus, DV-Schnittstelle und anzulegenden Wert.
- [ ] Echte Community-Daten, Geodaten, Mitgliedschafts-API und zulässige Zuordnung definieren.
- [ ] B2B-Mandant, Direktvermarkter und Producer-Rolle fachlich bestätigen. Kein erfundenes SAP/Elumina-Mapping: derzeit nur bereitgestellter Lumenaza-Adapter.

## Abgrenzung

Keine Marktkommunikation, Netzbetreiberprozesse, Prognosen, Monitoring, Abrechnung, Energy Sharing, Mieterstrom oder produktiven Portale. Die Community-Übersicht ist der ausdrücklich gewünschte lokale Nachlauf, kein operatives Kundenportal. Bankdaten nur im Arbeitsspeicher und bei ausdrücklichem JSON-Download in der Datei. Kein Browser-Storage; Neuladen verwirft den Entwurf. Der lokale Server prüft Bankdaten, speichert sie nicht und leitet sie nicht weiter.

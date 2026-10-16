# Adesso.App 1

Community-Energie-App. Website und Android-App nutzen **dieselbe** React-Oberfläche.

## Ablauf in der App

1. **Login** – ein Zugang für Einspeiser und Bezieher, die Ansicht passt sich der Rolle an
2. **Community** – Dortmund oder Grupenhagen
3. **Dashboard** mit drei Bereichen:
   - **Community**: Energieautarkie als Ring, Einspeisung, Verbrauch, Netzbezug, Verlaufsdiagramm, Karte mit allen Standorten
   - **Meine Anlage**: eigener Beitrag, Anteil an der Community, Erlöse, Kosten, Saldo, EMS-Verbindung
   - **Service**: Rechnungen und Stammdaten
4. **Zeitraum** wählbar: Heute, 7 Tage, 30 Tage, Jahr
5. **EMS** anmelden oder zuteilen lassen

Das Onboarding für die Direktvermarktung ist weiterhin enthalten und führt nach Abschluss direkt in die Community-App.

## Demo-Zugänge

| E-Mail | Passwort | Rolle |
| --- | --- | --- |
| `einspeiser@dortmund.de` | `demo1234` | Einspeiser |
| `bezieher@dortmund.de` | `demo1234` | Bezieher |
| `beides@grupenhagen.de` | `demo1234` | Einspeiser und Bezieher |

Im Login lassen sich die Zugänge per Klick einsetzen.

## Website starten

```powershell
cd web
npm ci
npm run build
npm start
```

Dann http://localhost:3000 öffnen.

## Android Studio

```powershell
cd web
npm run android
```

Danach den Ordner `android` in Android Studio öffnen, Gradle synchronisieren und starten. Die Oberfläche liegt als lokales Asset in der App und funktioniert auch ohne laufenden Server; ohne Server bleibt das Onboarding im lokalen Prüfmodus.

## Karte

OpenStreetMap über Leaflet. Kostenlos und ohne API-Schlüssel, mit Quellenangabe.

## Backend-Anbindung

Die Onboarding-Daten werden als JSON an den Lumenaza-Produzenten-Endpunkt gesendet:

```text
POST https://api.test.lumenaza.de/v3/producers/
```

Die Anmeldung erfolgt über OAuth2 Client Credentials. Zugangsdaten ausschließlich serverseitig aus Umgebungsvariablen, Vorlage in `web/.env.example`:

```text
LUMENAZA_CLIENT_ID=
LUMENAZA_CLIENT_SECRET=
```

Ohne diese Werte läuft die Anwendung im Demo-Modus und überträgt nichts.

## Stand der Daten

Energie-, Finanz-, Rechnungs- und EMS-Werte im Dashboard sind **Demo-Daten**. Noch offen sind: echte Nutzerverwaltung, Community-API, Messdaten im 5-Minuten-Takt, EMS-Schnittstellen der Anbieter sowie echte Abrechnung. Die Struktur ist dafür vorbereitet.

## Projektstruktur

- `web/src/App.jsx` – Login, Onboarding und Navigation
- `web/src/Login.jsx` – Anmeldung und Demo-Zugänge
- `web/src/Dashboard.jsx` – Community-Dashboard, Diagramm, Karte, EMS
- `web/src/community.mjs` – Communities, Standorte, Zeitreihen
- `web/server.mjs`, `web/lumenaza.mjs` – lokaler Server und OAuth2-Adapter
- `android/` – Android-Studio-Projekt

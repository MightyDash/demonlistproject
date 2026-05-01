# Moik's Demon List Starter

React + Vite demon list website voor Netlify.

## Lokaal testen

```bash
npm install
npm run dev
```

Open daarna de link die Vite geeft, meestal `http://localhost:5173`.

## Build testen

```bash
npm run build
npm run preview
```

## Netlify instellingen

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

## Apps Script API koppelen

Open:

```text
src/config.js
```

Vervang `SHEET_API_URL` met jouw Apps Script Web App URL.

Als de API niet werkt, gebruikt de site automatisch fallback data uit `src/mockData.js`.

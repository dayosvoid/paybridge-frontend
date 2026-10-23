# PayBridge frontend

React + TypeScript + Vite + Tailwind. Built in small slices.

## Run (PowerShell)

```
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:5173. With `VITE_USE_MOCK=true` (the default in `.env.example`) the app runs against an
in-browser mock of the PayBridge API, so no backend is needed.

## Use the real backend

1. Start the Spring Boot app on port 8080.
2. In `.env.local` set `VITE_USE_MOCK=false`.
3. Restart `npm run dev`.

In development the browser calls `/api/...` and Vite forwards it to `http://localhost:8080/...`, so the backend
needs no CORS setting. (CORS is only needed when the built app is served from a different origin than the API.)

## Scripts

- `npm run dev` - dev server
- `npm run build` - type-check and production build
- `npm test` - unit tests
- `npm run typecheck` - type-check only

## Mock sign-in

The mock has no users until you register one on the Register screen (slice 2). Data lives in memory and resets on reload.

# Desert Portfolio

A scroll-driven 3D portfolio built with Remix, React Three Fiber, and Three.js.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```
app/
  globals.css
  layout.tsx          # Remix app shell (used by root.tsx)
  page.tsx            # Home page (used by routes/_index.tsx)
  root.tsx            # Remix root entry
  routes/_index.tsx   # Remix route → page.tsx

features/
  portfolio/
    components/
      Experience.tsx
      scene/
      camera/
      animations/
      materials/
    config/
    hooks/
    utils/
    types/
```

## Scripts

- `npm run dev` — Remix dev server (Vite)
- `npm run build` — production build (SPA mode)
- `npm run start` — serve production build

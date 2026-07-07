# Portfolio Loaders

This directory contains the portfolio loading screen components with multiple design options.

## Available Loaders

### Loader 1: Desert Portfolio Loader (Default)
- **File:** `PortfolioLoader.tsx`
- **Style:** Desert-themed with animated dunes, destinations carousel, and morphing brand text
- **Features:**
  - Progress counter with destinations (Dubai Frame, Burj Al Arab, etc.)
  - Animated sand dunes and sky gradient
  - Brand morph animation ("10 TURTLE")
  - Responsive design for mobile and desktop

### Loader 2: Minimal Modern Loader
- **File:** `MinimalLoader.tsx`
- **Style:** Clean, modern design with circular progress indicator
- **Features:**
  - Animated circular progress ring
  - Loading phase indicators
  - Minimal dark theme with accent colors
  - Smooth entrance and exit animations
  - Responsive design

## How to Switch Loaders

To change which loader is displayed, edit the configuration file:

**File:** `features/portfolio/config/loaderSettings.ts`

```typescript
export const loaderSettings = {
  activeLoader: 'loader1' as LoaderType, // Change to 'loader2' for minimal loader
} as const;
```

### Options:
- `'loader1'` - Desert-themed loader (default)
- `'loader2'` - Minimal modern loader

## Architecture

The loader system uses a selector pattern:

```
LoaderSelector (wrapper)
├── PortfolioLoader (loader1)
└── MinimalLoader (loader2)
```

**LoaderSelector.tsx** reads the `loaderSettings` config and renders the appropriate loader component.

## Adding a New Loader

To add a new loader design:

1. Create a new component file (e.g., `CustomLoader.tsx`)
2. Implement the same props interface:
   ```typescript
   type LoaderProps = {
     isAssetsReady: boolean;
     onComplete: () => void;
   };
   ```
3. Add your CSS styles to `app/globals.css`
4. Update `loaderSettings.ts` to add your new loader type
5. Update `LoaderSelector.tsx` to handle your new loader option

## Styling

All loader styles are defined in `app/globals.css`:
- Loader 1 styles: `.sp-loader` classes
- Loader 2 styles: `.minimal-loader` classes

Both loaders use GSAP for smooth animations and transitions.

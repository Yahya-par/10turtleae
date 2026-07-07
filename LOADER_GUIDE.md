# Loader Switching Guide

## Quick Start

To switch between loaders, edit this single file:

**`features/portfolio/config/loaderSettings.ts`**

```typescript
export const loaderSettings = {
  activeLoader: 'loader1', // Change this to 'loader2'
} as const;
```

## Available Loaders

### Loader 1 (Default - Desert Theme)
```typescript
activeLoader: 'loader1'
```
- Original desert-themed loader
- Animated sand dunes with parallax
- Destination carousel (Dubai Frame, Burj Al Arab, etc.)
- Progress counter morphing to "10 TURTLE"
- Warm color palette matching your portfolio theme

### Loader 2 (Minimal Modern)
```typescript
activeLoader: 'loader2'
```
- Clean, minimal design
- Circular progress indicator with glowing animation
- Dark theme with subtle gradients
- Loading phase indicators
- Modern, professional appearance

## Files Structure

```
features/portfolio/
├── config/
│   └── loaderSettings.ts          ← Change loader here
└── components/
    └── loading/
        ├── LoaderSelector.tsx      ← Wrapper (reads config)
        ├── PortfolioLoader.tsx     ← Loader 1
        ├── MinimalLoader.tsx       ← Loader 2
        └── README.md               ← Detailed documentation
```

## Example: Switching to Loader 2

1. Open `features/portfolio/config/loaderSettings.ts`
2. Change line 9:
   ```typescript
   activeLoader: 'loader2' as LoaderType,
   ```
3. Save the file
4. Refresh your browser

## Important Notes

- ✅ Your original loader (Loader 1) is **completely untouched**
- ✅ The loader automatically detects when assets are ready
- ✅ Both loaders work on mobile and desktop
- ✅ GSAP animations are smooth and performant
- ✅ All styles are in `app/globals.css`

## Customization

### Change Loader Colors
Edit the CSS in `app/globals.css`:
- Loader 1: Search for `.sp-loader` classes
- Loader 2: Search for `.minimal-loader` classes

### Adjust Animation Speed
Edit the component files:
- `PortfolioLoader.tsx` - Loader 1 animations
- `MinimalLoader.tsx` - Loader 2 animations

Look for `duration:` values in GSAP animations.

---

**Need help?** Check `features/portfolio/components/loading/README.md` for detailed documentation.

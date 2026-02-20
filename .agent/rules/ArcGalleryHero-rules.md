---
trigger: model_decision
---

# ArcGalleryHero Component Rules

## Overview
A visual hero section featuring a curved gallery of pixel-art images. Designed for the "Pixel Retro" theme.

## Design
- **Layout**: Images arranged in an arc using trigonometric positioning.
- **Style**: 
  - Dark mode optimized (`bg-slate-900`).
  - Pixel-art focus (`rendering-pixelated`).
  - Scanline overlay effects.
  - Hover effects on cards (scale up, border glow).
- **Responsiveness**: Determines radius and card size based on window width (`Sm` < 640px, `Md` < 1024px, `Lg` >= 1024px).

## Props
- `images`: string[] (Required) - List of image URLs.
- `startAngle`: number (Default: 20) - Start angle in degrees.
- `endAngle`: number (Default: 160) - End angle in degrees.
- `radiusLg`, `radiusMd`, `radiusSm`: number - Radius for different breakpoints.
- `cardSizeLg`, `cardSizeMd`, `cardSizeSm`: number - Card size for different breakpoints.
- `className`: string - Additional classes.

## Implementation Details
- Uses `framer-motion` concepts (manual calculation currently) for positioning.
- **Client-Side Only**: Uses `useEffect` to detect window size, so it must be valid for specific breakpoints.
- **Dependencies**: `lucide-react`, `shadcn/ui` (Button, Badge, Card).

## Trigger
trigger: model_decision

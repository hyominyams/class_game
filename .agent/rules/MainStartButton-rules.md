---
trigger: model_decision
---

# MainStartButton Component Rules

## Overview
primary entry point button for the application.

## Design
- **Style**: Large, prominent button with gradient background.
- **Animation**: Simple entry animation (fade-in + slide-up) using framer-motion.
- **Interaction**: Hover scale effect.

## Props
None.

## Implementation Details
- Uses `useRouter` for client-side navigation to `/login`.
- Wraps `shadcn/ui` Button component.

## Trigger
trigger: model_decision

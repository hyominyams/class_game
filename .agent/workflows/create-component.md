---
description: Standard Component Creation Workflow (Pixel Art UI)
---

# 🧩 Helper Workflow: Create New Component

Follow this checklist when adding a new UI component to ensure consistency with the Pixel Art Design System.

## Step 1: File Creation
- [ ] Create file in `components/ui/[component-name].tsx`.
- [ ] Use `shadcn/ui` base if possible, or create from scratch for custom Pixel elements.

## Step 2: Implementation Standards
- [ ] **Container Style**:
  - `border-4 border-black` (or `border-[#18181b]`)
  - `bg-white` or `bg-[#fdf5e6]`
  - `shadow-[Xpx_Ypx_0px_#18181b]` (Hard offset shadow)
- [ ] **Typography**:
  - Headings: `font-pixel` (Press Start 2P)
  - Body: `font-bold` (Pretendard Bold/Black)
- [ ] **Props**:
  - Always include `className` prop and use `cn()` utility for merging.
  - Defined explicit interface for props.

## Step 3: Interactive States
- [ ] **Hover**: `hover:translate-y-[-2px]`
- [ ] **Active**: `active:translate-y-[2px]`
- [ ] **Focus**: `ring-2 ring-black` (No default blue ring)

## Step 4: Documentation & Demo
- [ ] Create a usage example in `app/demo/page.tsx` (or temporary route).
- [ ] Create a rule file in `.agent/rules/[component]-rules.md` if the component has complex logic or specific constraints.
- [ ] Verify responsiveness on **Tablet (Landscape)** size.

## Step 5: Final Review
- [ ] specific: Does it look "Retro" enough?
- [ ] specific: Are the borders thick enough (min 3px-4px)?
- [ ] specific: Is the shadow hard (no blur)?

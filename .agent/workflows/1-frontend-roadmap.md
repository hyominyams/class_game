---
description: Frontend Development Roadmap (Component & Page Implementation)
---

# 🗺️ Frontend Development Roadmap

This workflow outlines the step-by-step process for building the ClassQuest frontend.

## Phase 1: Foundation (Design System & Common Components)
- [ ] **Setup Global Styles**: Verify `tailwind.config.ts` and `app/globals.css` for Pixel theme colors and fonts.
- [ ] **Create Basic UI Kit**:
    - [ ] `PixelCard` (Container with border-4 & shadow)
    - [ ] `PixelButton` (3D effect on click)
    - [ ] `PixelInput` (Retro style form field)
    - [ ] `PixelBadge` (Status indicators)
    - [ ] `PixelModal` (Overlay dialogs)
    - [ ] `PixelTabs` (Folder style navigation)
- [ ] **Create Layout Wrappers**:
    - [ ] `StudentLayout` (Mobile/Tablet optimized, simplified nav)
    - [ ] `TeacherLayout` (Desktop optimized, sidebar nav)
    - [ ] `AdminLayout` (Console style)

## Phase 2: Student Experience (The "Player")
- [ ] **Dashboard (`/student/dashboard`)**:
    - [ ] User Stat Card (Coin, Rank, Score)
    - [ ] Quick Action Buttons
- [ ] **Game List (`/student/game`)**:
    - [ ] Game Card Component (Thumbnail + Info)
    - [ ] Filter/Category Tabs
- [ ] **Game Play (`/student/game/[id]`)**:
    - [ ] Game Container (Iframe/Canvas placeholder)
    - [ ] Sidebar (Score, Time, Quit Button)
- [ ] **Store (`/student/store`)**:
    - [ ] Item Grid
    - [ ] Purchase Modal
- [ ] **My Stat (`/student/stats`)**:
    - [ ] History List
    - [ ] Wrong Answer Review

## Phase 3: Teacher Experience (The "Manager")
- [ ] **Dashboard (`/teacher/dashboard`)**:
    - [ ] Class Status Summary
    - [ ] Quick Actions
- [ ] **Student Management (`/teacher/students`)**:
    - [ ] Student Table with Actions (Give Coin, Reset PW)
    - [ ] Create Student Account Modal
- [ ] **Question Management (`/teacher/questions`)**:
    - [ ] Question Set List
    - [ ] Question Editor (Form for 4-choice questions)
- [ ] **Tournament Management (`/teacher/tournaments`)**:
    - [ ] Create Tournament Wizard
    - [ ] Real-time Leaderboard

## Phase 4: Admin Experience (The "System")
- [ ] **Login Page (`/login`)**:
    - [ ] Retro PC Boot / OS Login Screen Style
- [ ] **Onboarding Modal**:
    - [ ] First-login Nickname & Password Change Flow
- [ ] **Admin Dashboard (`/admin/dashboard`)**:
    - [ ] System Health & Logs
- [ ] **User Management (`/admin/users`)**:
    - [ ] School/Grade/Class Structure Management
    - [ ] Account management for Teachers & Students

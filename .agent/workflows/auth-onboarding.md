---
description: Authentication & Onboarding Workflow (Login -> Setup -> Dashboard)
---

# 🔐 Authentication & Onboarding Workflow

This workflow defines the logic for user authentication, specifically the first-time login experience.

## Phase 1: Login Page (`/login`)
- [ ] **UI Implementation**:
  - [ ] Retro PC Boot Screen or Windows 95 style Login Dialog.
  - [ ] Input: ID (Student Number), Password.
  - [ ] "Login" Button (Pixel style).
- [ ] **Logic**:
  - [ ] Supabase `signInWithPassword`.
  - [ ] Handle errors (Wrong password, User not found).
  - [ ] **Critical**: Check `must_change_password` flag or if password is default (`a123456789`).

## Phase 2: Onboarding Modal (First Login)
- [ ] **Trigger**:
  - [ ] If user is logged in BUT `is_setup_complete` is false (or default PW detected).
  - [ ] Block access to all other routes (`/student/*`, `/teacher/*`).
- [ ] **Step 1: Nickname**:
  - [ ] Input field for "별명" (Nickname).
  - [ ] Duplicate check (optional, or just allow).
- [ ] **Step 2: Password Change**:
  - [ ] Input: New Password, Confirm Password.
  - [ ] Validation: Min 6 chars.
- [ ] **Completion**:
  - [ ] Update user profile in Supabase.
  - [ ] Set `is_setup_complete = true`.
  - [ ] Redirect to Role-based Dashboard.

## Phase 3: Session Management
- [ ] **Middleware**:
  - [ ] Protect `/student/*`, `/teacher/*`, `/admin/*` routes.
  - [ ] Redirect unauthenticated users to `/login`.
  - [ ] Redirect authenticated users trying to access login to their dashboard.

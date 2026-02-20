# ClassQuest Project Rules

## 1. Project Overview
**ClassQuest** is a classroom game learning platform that integrates results from multiple learning games into a unified platform for ranking, tournaments, and rewards.

### Technology Stack
- **Frontend**: Next.js (App Router), React, TailwindCSS, shadcn/ui
- **Backend/DB**: Supabase (PostgreSQL, Storage)
- **Game Engine**: Phaser.js
- **Deployment**: Vercel
- **Design Theme**: Pixel Art UI (정교한 8비트 고전 게임 감성)

---

## 2. Agent Responsibilities & Rules
Development must adhere to the specific responsibilities of these 9 Agents.

### 2.1 🧠 Product Agent (Manager)
- **Role**: Ultimate decision-maker on business rules.
- **Key Rules**:
  - Tournament Mode: Max 3 attempts per game.
  - Scoring: Only the **highest score** per game counts.
  - League/Promotion: Applies ONLY to **CLASS Tournaments**.
  - Grade Tournaments: Ranking display only (no league impact).

### 2.2 🎨 Frontend Agent (UI/UX)
- **Role**: UI Implementation.
- **Principles**:
  - **No direct DB access**. All requests must go through Server Actions / API Routes.
  - **Permission-based Rendering**: Do not render UI elements the user is not authorized to see.
  - **Dashboards**: Distinct views for Admin, Teacher, and Student.
  - **Pixel Art Consistency**: Ensure all UI elements follow the defined Pixel Art UI guidelines (bold borders, offset shadows, pixel fonts).

### 2.3 🛠️ Backend Agent (Server & DB)
- **Role**: Data Integrity.
- **Principles**:
  - **Soft Delete**: Hard delete is discouraged. Use flags (e.g., `deleted_at`).
  - **Derived Data**: Rankings/High Scores must be reproducible from raw logs.
  - **Validation**: Server-side validation of permissions and rules is mandatory, regardless of client-side checks.

### 2.4 🛡️ Auth & Permission Agent
- **Role**: Access Control.
- **Scopes**:
  - `ADMIN`: Global access.
  - `TEACHER`: Class scope (own grade/class).
  - `STUDENT`: Self scope (own data).
- **Security**:
  - Force password change on first login.
  - Re-verify permissions inside every Server Action.

### 2.5 🎮 Game Integration Agent
- **Role**: Phaser.js Bridge.
- **Implementation**:
  - Managed via Iframe/Canvas.
  - **Result Payload**: Must include `game_id`, `mode`, `score`, `correct_count`, `play_time`, `attempt_num`.

### 2.6 🏆 Scoring & Ranking Agent
- **Role**: Score Aggregation.
- **Rules**:
  - **Normal Mode**: Record all logs.
  - **Tournament Mode**:
    - Only valid within tournament duration.
    - Lock game after 3 attempts.
    - Aggregate highest score only.

### 2.7 📝 Question System Agent
- **Role**: Question Management.
- **Scopes**: `GLOBAL` vs `CLASS`.
- **Priority**: Active `CLASS` set > `GLOBAL` set.
- **Constraints**:
  - Max 34 sets per game/class.
  - Always 1 active set (cannot delete active set).

### 2.8 💰 Economy Agent
- **Role**: Currency System.
- **Principles**:
  - **Immutable Logs**: All changes must be recorded in `coin_transactions`.
  - **Balance**: Calculated as `SUM(amount)` from transactions.
- **Limits**: Normal mode earns coins max 3 times/day per game.

### 2.9 📊 Analytics Agent
- **Role**: Statistics & Reports.
- **Retention**:
  - Normal Logs: 120 days.
  - Monthly/Tournament Data: Permanent.

---

## 3. Collaboration Rules
1.  **PRD is Truth**: Conflicts between code and PRD are resolved in favor of PRD.
2.  **Double Validation**: Frontend validation is for UX; Backend validation is for Security. Both are required.
3.  **Conflict Resolution**:
    - UI vs Server -> Server wins.
    - Performance vs Rules -> Product Agent decides.

---

## 4. Component Development Workflow
1.  **Demo First Strategy**:
    - All new components must be **created and rendered in `app/demo/page.tsx` first**.
    - **Do not** add components to the Main Landing Page (`app/page.tsx`) automatically.
    - Only move components to the Main Page when explicitly requested or if they are core structural elements (e.g., Hero, Footer).
    
2.  **Documentation**:
    - Every new component must have a matching rule file: `.agent/rules/[ComponentName]-rules.md`.
    - This rule file must contain: Overview, Design specs, Props, and Implementation details.
    
---

## 5. Global UI Standard (Pixel Art UI)
All interface elements must follow the rules defined in `design-system-rules.md`.
- **Key Palette**: `#fdf5e6` (BG), `#ff2e63` (Accent), `#18181b` (Line).
- **Font**: `Press Start 2P` for headlines/numbers, bold sans-serif for body.
- **Visual**: **Bold lines (min 3px)**, **Offset shadows**, **No gradients**.

---
description: Bulk Create Student Modal Component Implementation
globs: components/teacher/bulk-create-student-modal.tsx
---

# BulkCreateStudentModal Rules

## 1. Design Intent
- **Purpose**: Teacher account management tool for efficient onboarding of entire classes.
- **Aesthetic**: Consistent with the "Pixel Art UI" system. Uses solid colors (`#6c5ce7`, `#00b894`), thick black borders (`border-4 border-black`), and retro shadows/typography (`font-pixel`).
- **User Flow**: Two-step process:
  1.  **Count Input**: Teacher enters the number of students to create.
  2.  **Detail Input**: A dynamically generated table of input fields for each student.
- **Feedback**: Provides immediate feedback via `toast` (Sonner) for validation errors and success/failure summaries.

## 2. Props Structure
- `children`: ReactNode (Trigger button)
- `teacherProfile`: Object containing `grade` and `class` (optional but recommended for context).

## 3. Implementation Details
- **State Management**:
  - `step`: Controls the wizard flow ('count' -> 'input').
  - `studentCount`: Stores the initial number of rows to generate.
  - `students`: Array of student objects `{ nickname: string, username: string }`.
- **Dynamic Form**:
  - Users can generate rows based on count.
  - Users can add individual rows via a dedicated "Add Row" button.
  - Users can remove individual rows via a "Trash" button.
- **Server Action**: Uses `createBulkStudentsAction` from `@/app/actions/teacher-v2` for processing.
- **Validation**:
  - Checks for empty nicknames or usernames.
  - Checks if at least one student is being created.

## 4. Key Behaviors
- **Reset on Close**: The modal resets its state (step, students array) when closed to ensure a clean slate for the next operation.
- **Error Handling**: Displays partial success/failure messages specifically listing which usernames failed.

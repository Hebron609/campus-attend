# Accra Institute of Technology (AIT) — Student Attendance Management System

**Course:** CS403 Capstone Project  
**QA Lead:** Ibrahim Alhassan (ID: ADS23B00133Y)  
**Backend & Database Developer:** Derek  
**Requirements Analyst:** Jebuni Mohammed Jamaldeen (ID: ADS23B00188Y)  
**System Designers:** Selorm & Ocean Bliss  
**Frontend Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons  
**Backend Stack:** Next.js Route Handlers, PostgreSQL (Neon DB), JWT Authentication  

---

## 🌊 AIT Branding & Visual Identity
- **Primary Color:** Sea Blue (`#007791`) & Academic Ocean Blue (`#0369A1` / `#0284C7`)
- **Secondary Colors:** Crisp White (`#FFFFFF`), Teal Accents (`#0D9488`), and Deep Navy (`#0A2540`)
- **Academic Insignia:** Custom AIT crest with university graduation cap motif and clear typographic hierarchy.

---

## 🎯 Role-Based Architecture & Features

### 1. Administrator Portal (`ADMIN`)
- **System Overview:** Total Courses, Lecturers, Students, and Active Sessions counts.
- **User Accounts Management (FR-02):** View users, filter by role (`LECTURER`, `STUDENT`, `ADMIN`), create new accounts (password $\ge 8$ chars), and toggle Active/Deactivated states (prevents self-deactivation).
- **Course Management (FR-03):** Setup new courses, assign responsible faculty lecturers, and toggle course active states.
- **Enrolment Management (FR-04):** View enrolled student rosters per course and enrol new students with duplicate-check prevention.
- **Attendance Summaries:** View auto-calculated attendance percentages for any course.

### 2. Faculty Lecturer Portal (`LECTURER`)
- **Assigned Courses Overview:** View courses assigned to the logged-in lecturer with enrolled student counts.
- **Class Session Creation & Attendance Recording (FR-05, FR-06):**
  - Select course and session date (`YYYY-MM-DD`).
  - View full enrolled roster.
  - Interactive One-Screen marking (NFR-03): **Present** or **Absent** toggles with quick "Mark All Present" and "Mark All Absent" shortcuts.
  - Roster completeness validation: Atomically saves attendance across the complete roster and handles HTTP 422 roster-check responses gracefully.
- **Session History & Review (FR-07):** Reopen past sessions to inspect recorded attendance statuses for all enrolled students.
- **Course Summary & Analytics (FR-08, FR-09):** Real-time calculated attendance percentages ($attended \div total \times 100$) with visual progress bars and alerts for students below the 75% examination threshold.

### 3. Student Portal (`STUDENT`)
- **Personal Dashboard (FR-10, NFR-01):** Read-only view restricted strictly to the student's own attendance records.
- **Overall Attendance Gauge:** Aggregated percentage across all semester courses with Academic Standing classification:
  - $\ge 75\%$: **Good Academic Standing**
  - $50\% - 74\%$: **Attendance Warning**
  - $< 50\%$: **Critical / At Risk**
- **Course Breakdown:** Per-course attendance ratios (e.g. 3 of 4 sessions) and percentage values formatted to 2 decimals.
- **Attendance History Log:** Chronological timeline of every class session and whether the student was marked `PRESENT` or `ABSENT`.

---

## 🧪 Demo Accounts for Evaluation

All demo accounts use password: `password123`

| Role | Name | Email | Permissions |
|---|---|---|---|
| **ADMIN** | System Administrator | `admin@attendance.local` | Manage users, courses, enrolments |
| **LECTURER** | Alice Mensah | `alice@attendance.local` | Mark attendance for Databases |
| **LECTURER** | Kwame Boateng | `kwame@attendance.local` | Mark attendance for Web Dev |
| **STUDENT** | Akosua Frimpong | `akosua@attendance.local` | View personal attendance |
| **STUDENT** | Yaw Osei | `yaw@attendance.local` | View personal attendance |

*Tip: A floating Quick Role Switcher toolbar is available at the top of the application for effortless evaluation without typing passwords.*

---

## 🚀 Running the Project

### Development Server
```bash
cd /Users/CEO/Desktop/ait-attendance-system
npm run dev -p 3001
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

### Production Build
```bash
npm run build
npm run start -p 3001
```

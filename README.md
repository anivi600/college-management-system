# College Management & Course Performance System

This is a full-stack web app built to your `college-management-prd.md`:
- React 18 + Vite + React Router (client)
- Express REST API + `mysql2` (server)
- MySQL 8 schema with strict normalization, plus stored procedures, triggers, and a complex view

## Project layout

- `server/` Express app + MySQL schema (`server/sql/init.sql`) + seed data (`server/sql/seed.sql`)
- `client/` Vite + React app

## 1) Set up MySQL

1. Open MySQL Workbench (or any SQL client).
2. Run: `server/sql/init.sql`
3. Run: `server/sql/seed.sql`

These scripts create the `college_management` database and the required tables:
`DEPARTMENT, FACULTY, STUDENT, COURSE, ENROLLMENT, GRADE, ATTENDANCE`

They also create:
- `enroll_student()` stored procedure (atomic enrollment + blank grade row)
- `assign_letter_grade()` stored procedure
- triggers for enrollment duplication defense + grade audit + grade letter derivation
- `student_report_view` and attendance aggregation function

## 2) Configure the backend

1. Copy `server/.env.example` to `server/.env`
2. Update `DB_USER` / `DB_PASSWORD` if needed.

## 3) Install & run

In two terminals:

### Backend
1. `cd server`
2. `npm install`
3. `npm run dev`

### Frontend
1. `cd client`
2. `npm install`
3. `npm run dev`

Open: `http://localhost:5173`

## API endpoints (high level)

- `GET /departments`
- `CRUD /students`
- `CRUD /faculty`
- `CRUD /courses`
- `POST /enrollments` (calls `enroll_student`)
- `GET /enrollments`
- `DELETE /enrollments/:id` (cascades to grade/attendance via FK)
- `PUT /grades` (updates `GRADE`, triggers audit + letter-grade derivation)
- `POST /attendance/batch` (course + class date, batch insert with upsert)
- `GET /report` (reads `student_report_view`)
- `GET /departments/overview` (departmental overview)

## Notes

- The PRD mentions “in-memory/session audit structure”; MySQL triggers can’t do that directly, so this implementation logs grade changes into `GRADE_AUDIT_LOG`.


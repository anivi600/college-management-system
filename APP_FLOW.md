# College Management App (Beginner Flow Guide)

This document explains how this web app works in plain language.

You will learn:
1. What the **frontend** is (browser side)
2. What the **backend** is (server side)
3. How the **frontend and backend communicate**
4. What the **database** stores and how special MySQL features (procedures/triggers/views) work
5. The folder structure inside this project

---

## 0) Big Picture (What happens when you use the app?)

When you open the site:
1. Your browser loads the **frontend** (React pages).
2. The frontend shows screens like Dashboard, Students, Courses, etc.
3. When you do something (example: add a student or submit attendance), the frontend sends a request to the **backend**.
4. The backend talks to **MySQL** using prepared queries and the stored procedures/triggers you created in `server/sql/init.sql`.
5. The backend returns data to the frontend.
6. The frontend updates what you see on the screen.

So the flow is always:
**Browser (Frontend) → Server (Backend) → MySQL (Database) → Server → Browser**

---

## 1) What “Frontend” Means (Client / Browser Side)

### Frontend tech used here
This app’s frontend uses:
- **React 18**: builds the user interface using components
- **Vite**: runs the development server and builds production files
- **React Router**: shows different screens based on the URL (like `/students`)
- **Axios**: sends requests (HTTP) to the backend

### Frontend folder structure
In `client/`:
- `client/src/main.jsx`
  - Entry point.
  - Creates the React app and enables routing.
- `client/src/App.jsx`
  - Defines all the routes (URLs) and which page component shows for each route.
  - Some pages are “lazy loaded” (loaded only when you visit them).
- `client/src/api.js`
  - Creates an Axios instance with the backend base URL.
  - So pages can call `api.get("/students")` instead of repeating the full server URL.
- `client/src/components/NavBar.jsx`
  - Left-side navigation links.
- `client/src/pages/*`
  - Each file is one screen/page:
    - `DashboardPage.jsx`
    - `StudentsPage.jsx`
    - `FacultyPage.jsx`
    - `CoursesPage.jsx`
    - `EnrollmentsPage.jsx` (lazy loaded)
    - `GradesPage.jsx` (lazy loaded)
    - `AttendancePage.jsx`
    - `DepartmentsPage.jsx`

### Frontend structure (basic ideas)
React apps are built from:
- **Components**: reusable UI parts
- **State**: values that can change (like “list of students”)
- **Effects** (`useEffect`): runs code when the page loads or when something changes

---

## 2) How the Frontend Works (Step by Step)

### 2.1 Routing (URLs control which page appears)
In `client/src/App.jsx`, routes are declared like:
- `/dashboard` → Dashboard page component
- `/students` → Students page component
- `/enrollments` and `/grades` are lazy loaded

This means:
- Changing the URL in the browser changes the screen
- No full page reload is required (React swaps components)

### 2.2 Data loading (useEffect)
Most pages do something like:
1. When the page loads, it fetches data from the backend.
2. It stores the returned data in component state.
3. The UI renders the table/forms based on that state.

Example pattern used in pages:
- `useEffect(() => { load() }, [])`
  - `[]` means “run only once when the page first loads”

### 2.3 Submitting forms (Add/Edit/Update)
When you press a button like “Add student”:
1. The frontend collects values from input fields
2. It calls a backend endpoint using Axios
3. If it succeeds, it reloads the list so the screen shows updated data

Example endpoints used by the frontend:
- POST `/students`
- PUT `/students/:id`
- DELETE `/students/:id`

### 2.4 Lazy loaded pages
Some routes are created with `React.lazy`.
That means:
- the app does not load those page code until you open the route
- faster initial load

Lazy loaded pages here:
- `/enrollments`
- `/grades`

---

## 3) What “Backend” Means (Server Side)

### Backend tech used here
This server uses:
- **Express.js**
  - Handles incoming requests from the browser.
  - Defines routes like `GET /students`.
- **mysql2**
  - Connects to MySQL using a connection pool.
  - Executes prepared statements.
- **dotenv**
  - Reads environment variables from `server/.env`.
- **cors**
  - Allows the browser frontend (port 5173) to call the backend (port 3001).

### Backend folder structure
In `server/`:
- `server/index.js`
  - Starts the Express server on `PORT` (default 3001).
- `server/app.js`
  - Contains all REST endpoints (the “API”).
  - Also includes error handling.
- `server/db.js`
  - Creates a MySQL connection pool.
  - Exposes `query(sql, params)` and the pool.
- `server/sql/init.sql`
  - Creates the database schema and MySQL logic (tables, procedures, triggers, view).
- `server/sql/seed.sql`
  - Inserts sample data so the UI has something to show.

---

## 4) Backend Structure (Detailed, but Simple)

### 4.1 MySQL connection pool (db.js)
The backend does NOT open a new MySQL connection for every request.
Instead, it uses a pool:
- This keeps connections ready
- It is faster and more stable for multiple requests

In `server/db.js`:
- `mysql.createPool(...)` creates the pool
- `pool.execute(sql, params)` runs SQL safely

Prepared queries matter because:
- they protect against SQL injection attacks
- the database treats data as values, not executable SQL

### 4.2 Express routes (app.js)
`server/app.js` defines endpoints like:
- `app.get("/students", ...)`
- `app.post("/students", ...)`
- `app.put("/students/:id", ...)`
- `app.delete("/students/:id", ...)`

Each endpoint:
1. Reads input (from URL params, query params, or JSON body)
2. Runs a SQL command (or stored procedure)
3. Returns JSON data to the frontend

### 4.3 Error handling
If anything fails (database error, trigger error, invalid input):
- the backend passes it to the error handler at the bottom of `app.js`
- the frontend receives an error message and displays it

---

## 5) Database (MySQL) Structure

### 5.1 Where schema comes from
All database tables and logic are created by:
- `server/sql/init.sql`

Important:
- This script drops and recreates the database named `college_management`
- So it is meant for setup/testing, not for preserving real data

### 5.2 The 7 core normalized tables
PRD requires 7 tables (strict normalization).

Here’s what each one stores:
1. `DEPARTMENT`
   - dept_id
   - dept_name
2. `FACULTY`
   - faculty_id, name, email
   - dept_id (which department they belong to)
3. `STUDENT`
   - student_id, name, email, semester
   - dept_id
4. `COURSE`
   - course_id, course_code, title, credits
   - faculty_id (who teaches it)
   - dept_id
5. `ENROLLMENT`
   - enrollment_id
   - student_id
   - course_id
   - enrolled_on (date)
   - status: active/dropped/completed
   - unique constraint: a student cannot enroll in the same course twice
6. `GRADE`
   - grade_id
   - enrollment_id (unique, so 1 enrollment has 1 grade row)
   - marks and letter_grade
   - updated_at
7. `ATTENDANCE`
   - attendance_id
   - enrollment_id
   - class_date
   - status: present/absent
   - unique constraint: enrollment_id + class_date can’t repeat

### 5.3 Why ENROLLMENT + GRADE are separated
PRD wants grade data stored in its own table.
That helps keep the database “clean” (no repeating or mixing unrelated facts).

So:
- ENROLLMENT answers: “Is the student enrolled?”
- GRADE answers: “What grade did they get for that enrollment?”

---

## 6) MySQL Stored Procedures & Triggers (Important PRD Features)

### 6.1 Stored procedure: `enroll_student(student_id, course_id)`
This is called when you enroll a student.

What it does:
1. Inserts a row into `ENROLLMENT`
2. Reads back the newly created enrollment_id
3. Creates a matching blank row in `GRADE`
4. Wraps it all in a transaction:
   - if anything fails, it rolls back both inserts

This is how your system stays consistent.

### 6.2 Trigger: “Prevent duplicate enrollments”
Trigger: `BEFORE INSERT ON ENROLLMENT`

Even though there is a UNIQUE constraint, the trigger adds a “second defense”.
It checks:
- if the student is already enrolled in the course
- then it throws a custom error

### 6.3 Stored procedure: `assign_letter_grade(marks)`
This converts numeric marks into letters like A/B/C/D/F.

The trigger later uses this logic automatically.

### 6.4 Trigger: “Set letter_grade automatically”
Trigger: `BEFORE UPDATE ON GRADE`

Whenever marks are updated:
- it calls `assign_letter_grade(NEW.marks, ...)`
- it updates `NEW.letter_grade`

So the frontend only updates marks, not letter grades.

### 6.5 Trigger: “Audit log on grade change”
Trigger: `AFTER UPDATE ON GRADE`

It writes changes into `GRADE_AUDIT_LOG`.

This log stores:
- old marks/old letter
- new marks/new letter
- timestamp

---

## 7) Views and Reports (Dashboard)

### 7.1 View: `student_report_view`
This view joins multiple tables to produce a report.

The view returns (for each enrollment):
- student name
- course info
- total marks (from GRADE)
- letter grade (from GRADE)
- attendance percentage (computed)

Attendance percentage uses:
- `calculate_attendance_percentage(enrollment_id)` function

### 7.2 Dashboard API: `GET /report`
The frontend calls:
- `GET /report` for all data
- `GET /report?studentId=...` to filter to a single student

The backend runs:
- `SELECT * FROM student_report_view ...`

and returns the results to the frontend.

---

## 8) End-to-End Flows by Feature

### 8.1 Students
Frontend page: `client/src/pages/StudentsPage.jsx`

Add student:
1. Fill the form (name, email, semester, dept)
2. Click “Add student”
3. Frontend calls `POST /students`
4. Backend inserts into `STUDENT`
5. Frontend reloads the table

Edit student:
1. Click “Edit” on a row
2. Frontend fills the form
3. Click “Update student”
4. Frontend calls `PUT /students/:id`

Delete student:
- frontend calls `DELETE /students/:id`

### 8.2 Faculty
Same idea as students, using:
- `POST /faculty`
- `PUT /faculty/:id`
- `DELETE /faculty/:id`

### 8.3 Courses
Same CRUD structure using:
- `POST /courses`
- `PUT /courses/:id`
- `DELETE /courses/:id`

### 8.4 Enrollments
Frontend page: `client/src/pages/EnrollmentsPage.jsx`

Enroll student:
1. Select a student and a course
2. Click “Enroll student”
3. Frontend calls `POST /enrollments`
4. Backend calls `CALL enroll_student(?, ?)`
5. That procedure inserts `ENROLLMENT` and creates a blank `GRADE` row

Drop enrollment:
- frontend calls `DELETE /enrollments/:id`
- foreign keys handle cleanup in the database (GRADE and ATTENDANCE)

### 8.5 Grades
Frontend page: `client/src/pages/GradesPage.jsx` (lazy loaded)

Update grade:
1. Type numeric marks
2. Click “Update”
3. Frontend calls `PUT /grades`
4. Backend updates `GRADE.marks`
5. MySQL trigger automatically sets `GRADE.letter_grade`
6. Audit trigger writes to `GRADE_AUDIT_LOG`

### 8.6 Attendance
Frontend page: `client/src/pages/AttendancePage.jsx`

Batch attendance:
1. Pick a course
2. Pick a class date
3. For each enrolled student, choose present/absent
4. Click “Submit batch attendance”
5. Frontend calls `POST /attendance/batch` with a list of `{ studentId, status }`

Backend batch behavior:
1. Starts a MySQL transaction
2. For each student, it finds the active `ENROLLMENT` row for that student+course
3. Inserts or updates a row in `ATTENDANCE` for `(enrollment_id, class_date)`
4. If any step fails, it rolls back the entire batch

---

## 9) Startup / Setup (How to get it running)

### 9.1 Required software
- MySQL Server 8+
- MySQL Workbench (or CLI)
- Node.js (for running frontend/backend JavaScript)

### 9.2 Create the database
Run these scripts in MySQL:
- `server/sql/init.sql` (creates tables + procedures + triggers + view)
- `server/sql/seed.sql` (adds sample data)

### 9.3 Configure backend
- Create `server/.env`
- It contains DB connection details used by `server/db.js`

### 9.4 Start server and client
1. Start server:
   - `cd server`
   - `npm install`
   - `npm run dev`
2. Start client:
   - `cd client`
   - `npm install`
   - `npm run dev`

Then open:
- `http://localhost:5173`

---

## 10) Quick Glossary (Very Basic Terms)

1. **Frontend**: the app UI in your browser
2. **Backend**: the server that processes requests
3. **API**: a set of endpoints (URLs) the frontend uses to talk to backend
4. **Database**: where data is stored (MySQL tables)
5. **Table**: like an Excel sheet (rows and columns)
6. **Foreign key (FK)**: a “link” between tables
7. **Stored procedure**: a reusable database function you call from backend
8. **Trigger**: database logic that runs automatically when data changes
9. **Transaction**: a “group of steps” that either all succeed or all fail
10. **View**: a saved query that returns joined/report data

---

## If you want, tell me one thing
Which part do you want me to explain next with an example using your own seeded data?
- enrolling students
- updating grades
- submitting attendance
- reading the dashboard report


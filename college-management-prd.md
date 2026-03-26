# Product Requirements Document (PRD)
**Product Name:** College Management and Course Performance System
**Document Version:** 1.0
**Target Audience:** Development Team, Database Administrators, Product Stakeholders

## 1. Product Overview
The College Management and Course Performance System is a full-stack web application designed to manage the core academic operations of a college. It tracks departments, faculty assignments, student enrollments, course offerings, daily attendance, and academic grading. 

Beyond standard CRUD operations, this system serves as a robust implementation of advanced Database Management System (DBMS) concepts, heavily utilizing MySQL features like strict normalization (3NF/BCNF), ACID transactions, automated triggers, stored procedures, and complex relational views.

## 2. Technology Stack & Architecture

### 2.1 Frontend (Client Layer)
* **Core Library:** React 18 (Utilizing component-based UI and Hooks for state management).
* **Build Tool:** Vite (Chosen for fast development server, Hot Module Replacement (HMR), and optimized production builds).
* **Routing:** React Router v6 (Client-side routing for views such as `/dashboard`, `/students`, and `/courses`).
* **HTTP Client:** Axios (For REST API calls to the Express backend).

### 2.2 Backend (Server Layer)
* **Runtime:** Node.js (JavaScript runtime for the server process).
* **Framework:** Express.js (Handling REST API routes: `/students`, `/courses`, `/enrollments`, `/grades`).
* **Database Driver:** `mysql2` (For asynchronous MySQL queries, connection pooling, and prepared statements).
* **Communication Protocol:** REST API over HTTP/JSON.

### 2.3 Database (Data Layer)
* **Engine:** MySQL 8.x (InnoDB engine for relational mapping and transactional support).
* **Structure:** 7 tightly normalized tables.

### 2.4 Development Environment & Tooling
* **Package Manager:** npm (Managing frontend and backend dependencies).
* **Database GUI:** MySQL Workbench (For schema design, trigger testing, and query debugging).
* **Dev Server:** nodemon (Auto-restarts Express server on file changes).
* **Environment Config:** `dotenv` (For managing DB credentials and port configurations via a `.env` file).

---

## 3. Database Architecture (Entity-Relationship)

The system relies on 7 strictly normalized tables designed to minimize redundancy and maintain data integrity.

### 3.1 The 7 Core Tables
1.  **DEPARTMENT (The Root Anchor)**
    * *Columns:* `dept_id` (PK), `dept_name`
    * *Purpose:* The parent entity for Faculty, Students, and Courses. Kept lean to act as a central anchor without introducing complexity.
2.  **FACULTY**
    * *Columns:* `faculty_id` (PK), `name`, `email`, `dept_id` (FK)
    * *Purpose:* Stores professor data. Adheres to 3NF; `dept_name` is omitted in favor of the FK to prevent transitive dependencies.
3.  **STUDENT**
    * *Columns:* `student_id` (PK), `name`, `email`, `semester`, `dept_id` (FK)
    * *Purpose:* Stores student profiles. `semester` is stored as a string (e.g., "Sem 3") as a deliberate simplification trade-off to avoid needing a separate `PROGRAM` table.
4.  **COURSE**
    * *Columns:* `course_id` (PK), `course_code`, `title`, `credits`, `faculty_id` (FK), `dept_id` (FK)
    * *Purpose:* Merges general course info with specific section offerings. Operates on the functional dependency that one course is taught by one specific faculty member (`course_id` → `faculty_id`).
5.  **ENROLLMENT (The Central Junction)**
    * *Columns:* `enrollment_id` (PK), `student_id` (FK), `course_id` (FK), `enrolled_on`, `status`
    * *Constraints:* `UNIQUE(student_id, course_id)` to prevent duplicate enrollments.
    * *Purpose:* Links students to courses. The `enrollment_id` surrogate key simplifies downstream FK relationships for Grades and Attendance. `status` (active/dropped/completed) allows for logical rollbacks and historical tracking.
6.  **GRADE**
    * *Columns:* `grade_id` (PK), `enrollment_id` (FK), `marks`, `letter_grade`, `updated_at`
    * *Purpose:* A 1:1 relationship with `ENROLLMENT`. Separated deliberately so grade updates can trigger audit logs without bloating or modifying the `ENROLLMENT` table.
7.  **ATTENDANCE**
    * *Columns:* `attendance_id` (PK), `enrollment_id` (FK), `class_date`, `status`
    * *Constraints:* Composite unique constraint on `(enrollment_id, class_date)`.
    * *Purpose:* Tracks daily student presence. A primary target for aggregate views (e.g., calculating attendance percentages).

---

## 4. Advanced DBMS Implementations (Core Business Logic)

The system enforces business rules at the database level rather than solely relying on the application backend.

### 4.1 Normalization (3NF & BCNF)
* **Requirement:** All tables must adhere strictly to the rule that every non-key attribute depends on the whole key, and nothing but the key.
* **Application:** The `GRADE` table is separated from `ENROLLMENT` to satisfy Boyce-Codd Normal Form (BCNF)—grade facts (marks, letter grade) do not belong inside the enrollment tuple.

### 4.2 ACID Transactions & Rollbacks
* **`enroll_student(student_id, course_id)`:** This process must be atomic. It inserts a row into the `ENROLLMENT` table and immediately creates a corresponding blank/default row in the `GRADE` table. If either insertion fails, the entire transaction **ROLLBACKS**.
* **Cascading Drops:** If a student drops a course (or an enrollment is deleted), the system must atomically cascade the deletion to corresponding `GRADE` and `ATTENDANCE` rows, or fail entirely.

### 4.3 Database Triggers
* **`BEFORE INSERT ON ENROLLMENT`:** Checks if the student is already enrolled in the course (acting as a secondary defense alongside the UNIQUE constraint) and raises a custom exception if true.
* **`AFTER UPDATE ON GRADE`:** Acts as an audit mechanism. Whenever a student's `marks` or `letter_grade` changes, this trigger logs the old and new values, along with the `updated_at` timestamp, to an in-memory/session audit structure.

### 4.4 Stored Procedures & Views
* **View: `student_report_view`:** A complex query that joins all 7 tables to produce a comprehensive, read-only performance summary. It outputs the student's name, course title, total marks, calculated attendance percentage, and current letter grade.
* **Procedure: `calculate_attendance()` / `calculate_attendance_percentage(enrollment_id)`:** A callable routine that aggregates the `ATTENDANCE` table for a specific enrollment to return the percentage of classes attended.
* **Procedure: `assign_letter_grade(marks)`:** A callable routine that evaluates a numeric score and translates it into a standard letter grade (A, B, C, etc.) based on predefined institutional bands.

---

## 5. System Features & User Flows

### 5.1 Dashboard & Navigation
* Users are greeted with a dashboard powered by React Router, utilizing `student_report_view` to display college-wide or student-specific summary metrics.
* Navigation links route to isolated views: `/students`, `/courses`, and departmental overviews.

### 5.2 Academic Administration
* **Students & Faculty:** Administrators can perform CRUD operations on `STUDENT` and `FACULTY` tables. Data is mapped to respective departments via drop-downs populated by the `DEPARTMENT` table.
* **Course Assignment:** Courses are created and assigned to a single faculty member. 

### 5.3 Grading & Attendance Tracking
* **Marking Attendance:** Faculty can batch-insert attendance records for a specific course and `class_date`.
* **Updating Grades:** Faculty can input numeric marks via the client. The Express backend sends an `UPDATE` query to the `GRADE` table, seamlessly triggering the underlying MySQL audit trigger and `assign_letter_grade()` procedure.

---

## 6. Non-Functional Requirements
* **Performance:** The backend must utilize `mysql2` connection pooling to handle concurrent database requests (e.g., batch attendance uploads) without hanging the Express server.
* **Data Integrity:** The application must strictly enforce the `mysql2` driver's prepared statements to prevent SQL injection attacks.
* **Scalability:** The React Vite build must be optimized for fast load times, lazy-loading routes like `/grades` and `/enrollments` only when accessed by the user.
USE college_management;

-- ==============================
-- Departments (3)
-- ==============================
INSERT INTO DEPARTMENT (dept_name) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('Business Administration');

-- ==============================
-- Faculty (5)
-- ==============================
INSERT INTO FACULTY (name, email, dept_id) VALUES
  ('Dr. Asha Rao', 'asha.rao@college.edu', 1),
  ('Prof. Neel Mehta', 'neel.mehta@college.edu', 1),
  ('Dr. Priya Sen', 'priya.sen@college.edu', 2),
  ('Dr. Vikram Joshi', 'vikram.joshi@college.edu', 2),
  ('Prof. Sneha Gupta', 'sneha.gupta@college.edu', 3);

-- ==============================
-- Students (8)
-- ==============================
INSERT INTO STUDENT (name, email, semester, dept_id) VALUES
  ('Karan Verma', 'karan.verma@college.edu', 'Sem 3', 1),
  ('Meera Iyer', 'meera.iyer@college.edu', 'Sem 3', 1),
  ('Rohit Sharma', 'rohit.sharma@college.edu', 'Sem 2', 2),
  ('Ananya Desai', 'ananya.desai@college.edu', 'Sem 4', 1),
  ('Prateek Kumar', 'prateek.kumar@college.edu', 'Sem 1', 2),
  ('Divya Nair', 'divya.nair@college.edu', 'Sem 5', 3),
  ('Arjun Patel', 'arjun.patel@college.edu', 'Sem 3', 1),
  ('Simran Kaur', 'simran.kaur@college.edu', 'Sem 2', 3);

-- ==============================
-- Courses (5)
-- ==============================
INSERT INTO COURSE (course_code, title, credits, faculty_id, dept_id) VALUES
  ('CS301', 'Data Structures', 4, 1, 1),
  ('CS302', 'Database Systems', 4, 2, 1),
  ('MATH201', 'Linear Algebra', 3, 3, 2),
  ('MATH202', 'Probability & Statistics', 3, 4, 2),
  ('BA101', 'Principles of Management', 3, 5, 3);

-- ==============================
-- Enrollments via stored procedure (atomic insert + blank grade)
-- ==============================
CALL enroll_student(1, 1); -- Karan in CS301
CALL enroll_student(2, 1); -- Meera in CS301
CALL enroll_student(1, 2); -- Karan in CS302
CALL enroll_student(3, 3); -- Rohit in MATH201
CALL enroll_student(4, 1); -- Ananya in CS301
CALL enroll_student(4, 2); -- Ananya in CS302
CALL enroll_student(5, 3); -- Prateek in MATH201
CALL enroll_student(5, 4); -- Prateek in MATH202
CALL enroll_student(6, 5); -- Divya in BA101
CALL enroll_student(7, 1); -- Arjun in CS301
CALL enroll_student(7, 2); -- Arjun in CS302
CALL enroll_student(8, 5); -- Simran in BA101
CALL enroll_student(2, 2); -- Meera in CS302
CALL enroll_student(3, 4); -- Rohit in MATH202

-- ==============================
-- Update grades (triggers will auto-assign letter_grade + audit log)
-- ==============================
UPDATE GRADE SET marks = 92.50 WHERE enrollment_id = 1;  -- Karan CS301
UPDATE GRADE SET marks = 85.00 WHERE enrollment_id = 2;  -- Meera CS301
UPDATE GRADE SET marks = 78.00 WHERE enrollment_id = 3;  -- Karan CS302
UPDATE GRADE SET marks = 65.00 WHERE enrollment_id = 4;  -- Rohit MATH201
UPDATE GRADE SET marks = 88.50 WHERE enrollment_id = 5;  -- Ananya CS301
UPDATE GRADE SET marks = 71.00 WHERE enrollment_id = 6;  -- Ananya CS302
UPDATE GRADE SET marks = 55.00 WHERE enrollment_id = 7;  -- Prateek MATH201
UPDATE GRADE SET marks = 43.00 WHERE enrollment_id = 8;  -- Prateek MATH202
UPDATE GRADE SET marks = 91.00 WHERE enrollment_id = 9;  -- Divya BA101
UPDATE GRADE SET marks = 76.00 WHERE enrollment_id = 10; -- Arjun CS301
UPDATE GRADE SET marks = 82.50 WHERE enrollment_id = 11; -- Arjun CS302
UPDATE GRADE SET marks = 95.00 WHERE enrollment_id = 12; -- Simran BA101
UPDATE GRADE SET marks = 69.00 WHERE enrollment_id = 13; -- Meera CS302
UPDATE GRADE SET marks = 58.00 WHERE enrollment_id = 14; -- Rohit MATH202

-- ==============================
-- Seed attendance data (mix of present/absent)
-- ==============================

-- CS301 attendance (enrollment_ids: 1,2,5,10 → Karan,Meera,Ananya,Arjun)
INSERT INTO ATTENDANCE (enrollment_id, class_date, status) VALUES
  (1, '2026-03-10', 'present'), (1, '2026-03-12', 'present'), (1, '2026-03-14', 'present'),
  (1, '2026-03-17', 'present'), (1, '2026-03-19', 'absent'),  (1, '2026-03-21', 'present'),
  (2, '2026-03-10', 'present'), (2, '2026-03-12', 'absent'),  (2, '2026-03-14', 'present'),
  (2, '2026-03-17', 'present'), (2, '2026-03-19', 'present'), (2, '2026-03-21', 'present'),
  (5, '2026-03-10', 'present'), (5, '2026-03-12', 'present'), (5, '2026-03-14', 'absent'),
  (5, '2026-03-17', 'present'), (5, '2026-03-19', 'present'), (5, '2026-03-21', 'present'),
  (10,'2026-03-10', 'absent'),  (10,'2026-03-12', 'absent'),  (10,'2026-03-14', 'present'),
  (10,'2026-03-17', 'present'), (10,'2026-03-19', 'absent'),  (10,'2026-03-21', 'present');

-- CS302 attendance (enrollment_ids: 3,6,11,13 → Karan,Ananya,Arjun,Meera)
INSERT INTO ATTENDANCE (enrollment_id, class_date, status) VALUES
  (3, '2026-03-11', 'present'), (3, '2026-03-13', 'present'), (3, '2026-03-18', 'present'),
  (3, '2026-03-20', 'absent'),  (3, '2026-03-25', 'present'),
  (6, '2026-03-11', 'present'), (6, '2026-03-13', 'absent'),  (6, '2026-03-18', 'present'),
  (6, '2026-03-20', 'present'), (6, '2026-03-25', 'present'),
  (11,'2026-03-11', 'present'), (11,'2026-03-13', 'present'), (11,'2026-03-18', 'present'),
  (11,'2026-03-20', 'present'), (11,'2026-03-25', 'absent'),
  (13,'2026-03-11', 'absent'),  (13,'2026-03-13', 'present'), (13,'2026-03-18', 'absent'),
  (13,'2026-03-20', 'present'), (13,'2026-03-25', 'present');

-- MATH201 attendance (enrollment_ids: 4,7 → Rohit, Prateek)
INSERT INTO ATTENDANCE (enrollment_id, class_date, status) VALUES
  (4, '2026-03-10', 'present'), (4, '2026-03-12', 'absent'),  (4, '2026-03-14', 'absent'),
  (4, '2026-03-17', 'present'), (4, '2026-03-19', 'present'),
  (7, '2026-03-10', 'absent'),  (7, '2026-03-12', 'absent'),  (7, '2026-03-14', 'present'),
  (7, '2026-03-17', 'absent'),  (7, '2026-03-19', 'present');

-- BA101 attendance (enrollment_ids: 9,12 → Divya, Simran)
INSERT INTO ATTENDANCE (enrollment_id, class_date, status) VALUES
  (9, '2026-03-10', 'present'), (9, '2026-03-12', 'present'), (9, '2026-03-14', 'present'),
  (9, '2026-03-17', 'present'), (9, '2026-03-19', 'present'), (9, '2026-03-21', 'absent'),
  (12,'2026-03-10', 'present'), (12,'2026-03-12', 'present'), (12,'2026-03-14', 'present'),
  (12,'2026-03-17', 'present'), (12,'2026-03-19', 'present'), (12,'2026-03-21', 'present');

-- Some grade updates to generate audit log entries
UPDATE GRADE SET marks = 94.00 WHERE enrollment_id = 1;  -- Karan CS301 improved
UPDATE GRADE SET marks = 87.00 WHERE enrollment_id = 2;  -- Meera CS301 improved

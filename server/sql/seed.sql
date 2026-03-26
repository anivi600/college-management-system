USE college_management;

-- Seed departments
INSERT INTO DEPARTMENT (dept_name) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('Business Administration');

-- Seed faculty (dept_id values assumed auto-increment from insertion order)
INSERT INTO FACULTY (name, email, dept_id) VALUES
  ('Dr. Asha Rao', 'asha.rao@college.edu', 1),
  ('Prof. Neel Mehta', 'neel.mehta@college.edu', 1),
  ('Dr. Priya Sen', 'priya.sen@college.edu', 2);

-- Seed students
INSERT INTO STUDENT (name, email, semester, dept_id) VALUES
  ('Karan Verma', 'karan.verma@college.edu', 'Sem 3', 1),
  ('Meera Iyer', 'meera.iyer@college.edu', 'Sem 3', 1),
  ('Rohit Sharma', 'rohit.sharma@college.edu', 'Sem 2', 2);

-- Seed courses (faculty_id values assumed auto-increment from insertion order)
INSERT INTO COURSE (course_code, title, credits, faculty_id, dept_id) VALUES
  ('CS301', 'Data Structures', 4, 1, 1),
  ('CS302', 'Database Systems', 4, 2, 1),
  ('MATH201', 'Linear Algebra', 3, 3, 2);

-- Enroll a few students using stored procedure (ensures ENROLLMENT + blank GRADE row)
CALL enroll_student(1, 1); -- Karan in CS301
CALL enroll_student(2, 1); -- Meera in CS301
CALL enroll_student(1, 2); -- Karan in CS302


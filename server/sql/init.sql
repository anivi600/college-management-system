-- College Management and Course Performance System (MySQL 8+)
-- ============================================================
-- Creates the 7 normalized tables + audit tables + advanced DB-level logic:
--   • enroll_student()              – atomic enrollment + blank grade row
--   • assign_letter_grade()         – marks → letter grade
--   • get_student_transcript()      – full transcript for a student
--   • get_top_students()            – top N students by marks for a course
--   • get_students_at_risk()        – low attendance / low marks
--   • update_enrollment_status()    – atomic status change with validation
--   • get_department_statistics()   – aggregated dept stats
--   • bulk_assign_grades()          – re-derive letter grades for a course
--   • calculate_attendance_percentage() – attendance aggregation function
--   • BEFORE INSERT trigger on ENROLLMENT (duplicate defense)
--   • BEFORE UPDATE trigger on GRADE (auto letter-grade)
--   • AFTER UPDATE trigger on GRADE (audit log)
--   • AFTER DELETE trigger on ENROLLMENT (audit log)
--   • student_report_view           – comprehensive report
--   • dept_statistics_view          – per-department aggregates
--   • course_workload_view          – per-course workload summary

DROP DATABASE IF EXISTS college_management;
CREATE DATABASE college_management;
USE college_management;

-- ==============================
-- Core tables (7)
-- ==============================
CREATE TABLE DEPARTMENT (
  dept_id INT AUTO_INCREMENT PRIMARY KEY,
  dept_name VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE FACULTY (
  faculty_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  dept_id INT NOT NULL,
  CONSTRAINT fk_faculty_dept
    FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE STUDENT (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  semester VARCHAR(50) NOT NULL,
  dept_id INT NOT NULL,
  CONSTRAINT fk_student_dept
    FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE COURSE (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  credits INT NOT NULL CHECK (credits > 0),
  faculty_id INT NOT NULL,
  dept_id INT NOT NULL,
  CONSTRAINT fk_course_faculty
    FOREIGN KEY (faculty_id) REFERENCES FACULTY(faculty_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_course_dept
    FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ENROLLMENT: unique student+course + status (active/dropped/completed)
CREATE TABLE ENROLLMENT (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_on DATE NOT NULL,
  status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active',
  CONSTRAINT uq_student_course UNIQUE (student_id, course_id),
  CONSTRAINT fk_enrollment_student
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_course
    FOREIGN KEY (course_id) REFERENCES COURSE(course_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- GRADE: 1:1 with ENROLLMENT
CREATE TABLE GRADE (
  grade_id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL UNIQUE,
  marks DECIMAL(5,2) NULL,
  letter_grade VARCHAR(2) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grade_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(enrollment_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ATTENDANCE: composite unique (enrollment_id, class_date)
CREATE TABLE ATTENDANCE (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  class_date DATE NOT NULL,
  status ENUM('present','absent') NOT NULL,
  CONSTRAINT uq_attendance UNIQUE (enrollment_id, class_date),
  CONSTRAINT fk_attendance_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(enrollment_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==============================
-- Audit tables
-- ==============================

-- Audit table for GRADE updates (populated by AFTER UPDATE trigger)
CREATE TABLE GRADE_AUDIT_LOG (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  grade_id INT NOT NULL,
  enrollment_id INT NULL,
  student_name VARCHAR(160) NULL,
  course_code VARCHAR(50) NULL,
  old_marks DECIMAL(5,2) NULL,
  old_letter_grade VARCHAR(2) NULL,
  new_marks DECIMAL(5,2) NULL,
  new_letter_grade VARCHAR(2) NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Audit table for ENROLLMENT deletions (populated by AFTER DELETE trigger)
CREATE TABLE ENROLLMENT_AUDIT_LOG (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  student_name VARCHAR(160) NULL,
  course_code VARCHAR(50) NULL,
  enrolled_on DATE NULL,
  old_status VARCHAR(20) NULL,
  dropped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ==============================
-- Stored procedures & functions
-- ==============================
DELIMITER $$

-- 1. Converts numeric marks into a letter grade (institution bands)
CREATE PROCEDURE assign_letter_grade(IN p_marks DECIMAL(5,2), OUT p_letter_grade VARCHAR(2))
BEGIN
  IF p_marks IS NULL THEN
    SET p_letter_grade = NULL;
  ELSEIF p_marks >= 90 THEN
    SET p_letter_grade = 'A+';
  ELSEIF p_marks >= 80 THEN
    SET p_letter_grade = 'A';
  ELSEIF p_marks >= 70 THEN
    SET p_letter_grade = 'B';
  ELSEIF p_marks >= 60 THEN
    SET p_letter_grade = 'C';
  ELSEIF p_marks >= 50 THEN
    SET p_letter_grade = 'D';
  ELSE
    SET p_letter_grade = 'F';
  END IF;
END$$

-- 2. Atomic enrollment insertion + blank/default grade row
CREATE PROCEDURE enroll_student(IN p_student_id INT, IN p_course_id INT)
BEGIN
  DECLARE v_enrollment_id INT DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO ENROLLMENT (student_id, course_id, enrolled_on, status)
  VALUES (p_student_id, p_course_id, CURDATE(), 'active');

  SET v_enrollment_id = LAST_INSERT_ID();

  -- Create corresponding blank grade row (default NULL marks/letter)
  INSERT INTO GRADE (enrollment_id, marks, letter_grade, updated_at)
  VALUES (v_enrollment_id, NULL, NULL, NOW());

  COMMIT;
END$$

-- 3. Attendance percentage calculator (function used by views)
CREATE FUNCTION calculate_attendance_percentage(p_enrollment_id INT)
RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
  DECLARE v_present INT DEFAULT 0;
  DECLARE v_total INT DEFAULT 0;

  SELECT
    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END),
    COUNT(*)
  INTO v_present, v_total
  FROM ATTENDANCE
  WHERE enrollment_id = p_enrollment_id;

  IF v_total IS NULL OR v_total = 0 THEN
    RETURN 0.00;
  END IF;

  RETURN ROUND((v_present * 100.0) / v_total, 2);
END$$

-- 4. Optional procedure wrapper (CALLable version of the attendance function)
CREATE PROCEDURE calculate_attendance_percentage_proc(IN p_enrollment_id INT, OUT p_percentage DECIMAL(5,2))
BEGIN
  SET p_percentage = calculate_attendance_percentage(p_enrollment_id);
END$$

-- ==============================
-- NEW STORED PROCEDURES
-- ==============================

-- 5. Get full student transcript (joins across 5+ tables)
CREATE PROCEDURE get_student_transcript(IN p_student_id INT)
BEGIN
  SELECT
    s.student_id,
    s.name AS student_name,
    s.email AS student_email,
    s.semester,
    d.dept_name,
    c.course_id,
    c.course_code,
    c.title AS course_title,
    c.credits,
    f.name AS faculty_name,
    e.enrollment_id,
    e.enrolled_on,
    e.status AS enrollment_status,
    g.marks,
    g.letter_grade,
    g.updated_at AS grade_updated_at,
    calculate_attendance_percentage(e.enrollment_id) AS attendance_pct,
    (SELECT COUNT(*) FROM ATTENDANCE a WHERE a.enrollment_id = e.enrollment_id) AS total_classes,
    (SELECT SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)
     FROM ATTENDANCE a WHERE a.enrollment_id = e.enrollment_id) AS classes_attended
  FROM STUDENT s
  JOIN DEPARTMENT d ON d.dept_id = s.dept_id
  JOIN ENROLLMENT e ON e.student_id = s.student_id
  JOIN COURSE c ON c.course_id = e.course_id
  JOIN FACULTY f ON f.faculty_id = c.faculty_id
  LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id
  WHERE s.student_id = p_student_id
  ORDER BY c.course_code;
END$$

-- 6. Get top N students by marks for a given course
CREATE PROCEDURE get_top_students(IN p_course_id INT, IN p_limit INT)
BEGIN
  SELECT
    s.student_id,
    s.name AS student_name,
    s.email,
    c.course_code,
    c.title AS course_title,
    g.marks,
    g.letter_grade,
    calculate_attendance_percentage(e.enrollment_id) AS attendance_pct
  FROM ENROLLMENT e
  JOIN STUDENT s ON s.student_id = e.student_id
  JOIN COURSE c ON c.course_id = e.course_id
  LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id
  WHERE e.course_id = p_course_id
    AND e.status = 'active'
    AND g.marks IS NOT NULL
  ORDER BY g.marks DESC
  LIMIT p_limit;
END$$

-- 7. Find students at risk (low attendance OR low marks)
CREATE PROCEDURE get_students_at_risk(IN p_min_attendance DECIMAL(5,2), IN p_min_marks DECIMAL(5,2))
BEGIN
  SELECT
    s.student_id,
    s.name AS student_name,
    s.email,
    d.dept_name,
    c.course_code,
    c.title AS course_title,
    g.marks,
    g.letter_grade,
    calculate_attendance_percentage(e.enrollment_id) AS attendance_pct,
    CASE
      WHEN calculate_attendance_percentage(e.enrollment_id) < p_min_attendance AND (g.marks IS NOT NULL AND g.marks < p_min_marks)
        THEN 'Low Attendance & Low Marks'
      WHEN calculate_attendance_percentage(e.enrollment_id) < p_min_attendance
        THEN 'Low Attendance'
      WHEN g.marks IS NOT NULL AND g.marks < p_min_marks
        THEN 'Low Marks'
      ELSE 'Unknown'
    END AS risk_reason
  FROM ENROLLMENT e
  JOIN STUDENT s ON s.student_id = e.student_id
  JOIN DEPARTMENT d ON d.dept_id = s.dept_id
  JOIN COURSE c ON c.course_id = e.course_id
  LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id
  WHERE e.status = 'active'
    AND (
      calculate_attendance_percentage(e.enrollment_id) < p_min_attendance
      OR (g.marks IS NOT NULL AND g.marks < p_min_marks)
    )
  ORDER BY g.marks ASC, s.name;
END$$

-- 8. Atomically update enrollment status with validation
CREATE PROCEDURE update_enrollment_status(IN p_enrollment_id INT, IN p_new_status VARCHAR(20))
BEGIN
  DECLARE v_current_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status INTO v_current_status
  FROM ENROLLMENT
  WHERE enrollment_id = p_enrollment_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Enrollment not found';
  END IF;

  -- Validate transitions: cannot re-activate a completed enrollment
  IF v_current_status = 'completed' AND p_new_status = 'active' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot re-activate a completed enrollment';
  END IF;

  IF v_current_status = 'dropped' AND p_new_status = 'active' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot re-activate a dropped enrollment';
  END IF;

  UPDATE ENROLLMENT
  SET status = p_new_status
  WHERE enrollment_id = p_enrollment_id;

  COMMIT;
END$$

-- 9. Get aggregated department statistics
CREATE PROCEDURE get_department_statistics(IN p_dept_id INT)
BEGIN
  SELECT
    d.dept_id,
    d.dept_name,
    (SELECT COUNT(*) FROM STUDENT st WHERE st.dept_id = d.dept_id) AS student_count,
    (SELECT COUNT(*) FROM FACULTY fc WHERE fc.dept_id = d.dept_id) AS faculty_count,
    (SELECT COUNT(*) FROM COURSE cr WHERE cr.dept_id = d.dept_id) AS course_count,
    (SELECT ROUND(AVG(g2.marks), 2)
     FROM GRADE g2
     JOIN ENROLLMENT e2 ON e2.enrollment_id = g2.enrollment_id
     JOIN COURSE c2 ON c2.course_id = e2.course_id
     WHERE c2.dept_id = d.dept_id AND g2.marks IS NOT NULL) AS avg_marks,
    (SELECT ROUND(AVG(calculate_attendance_percentage(e3.enrollment_id)), 2)
     FROM ENROLLMENT e3
     JOIN COURSE c3 ON c3.course_id = e3.course_id
     WHERE c3.dept_id = d.dept_id AND e3.status = 'active') AS avg_attendance
  FROM DEPARTMENT d
  WHERE (p_dept_id IS NULL OR d.dept_id = p_dept_id)
  ORDER BY d.dept_name;
END$$

-- 10. Bulk assign letter grades for all enrollments in a course
CREATE PROCEDURE bulk_assign_grades(IN p_course_id INT)
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_enrollment_id INT;
  DECLARE v_marks DECIMAL(5,2);
  DECLARE v_letter VARCHAR(2);

  DECLARE cur CURSOR FOR
    SELECT g.enrollment_id, g.marks
    FROM GRADE g
    JOIN ENROLLMENT e ON e.enrollment_id = g.enrollment_id
    WHERE e.course_id = p_course_id
      AND g.marks IS NOT NULL;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_enrollment_id, v_marks;
    IF v_done THEN
      LEAVE read_loop;
    END IF;

    CALL assign_letter_grade(v_marks, v_letter);
    UPDATE GRADE
    SET letter_grade = v_letter
    WHERE enrollment_id = v_enrollment_id;
  END LOOP;
  CLOSE cur;

  COMMIT;
END$$

DELIMITER ;

-- ==============================
-- Triggers
-- ==============================
DELIMITER $$

-- Secondary defense vs duplicate enrollments
CREATE TRIGGER trg_enrollment_before_insert
BEFORE INSERT ON ENROLLMENT
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ENROLLMENT
    WHERE student_id = NEW.student_id
      AND course_id = NEW.course_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student is already enrolled in this course';
  END IF;
END$$

-- Ensure letter_grade is always derived from marks on UPDATE
CREATE TRIGGER trg_grade_before_update
BEFORE UPDATE ON GRADE
FOR EACH ROW
BEGIN
  DECLARE v_letter_grade VARCHAR(2);
  CALL assign_letter_grade(NEW.marks, v_letter_grade);
  SET NEW.letter_grade = v_letter_grade;
  -- updated_at is already maintained by ON UPDATE CURRENT_TIMESTAMP
END$$

-- Audit old/new values on grade changes (enriched with student + course info)
CREATE TRIGGER trg_grade_after_update
AFTER UPDATE ON GRADE
FOR EACH ROW
BEGIN
  DECLARE v_student_name VARCHAR(160);
  DECLARE v_course_code VARCHAR(50);

  IF NOT (
    OLD.marks <=> NEW.marks
    AND OLD.letter_grade <=> NEW.letter_grade
  ) THEN
    -- Look up student name and course code for richer audit
    SELECT s.name, c.course_code
    INTO v_student_name, v_course_code
    FROM ENROLLMENT e
    JOIN STUDENT s ON s.student_id = e.student_id
    JOIN COURSE c ON c.course_id = e.course_id
    WHERE e.enrollment_id = OLD.enrollment_id
    LIMIT 1;

    INSERT INTO GRADE_AUDIT_LOG (
      grade_id,
      enrollment_id,
      student_name,
      course_code,
      old_marks,
      old_letter_grade,
      new_marks,
      new_letter_grade
    ) VALUES (
      OLD.grade_id,
      OLD.enrollment_id,
      v_student_name,
      v_course_code,
      OLD.marks,
      OLD.letter_grade,
      NEW.marks,
      NEW.letter_grade
    );
  END IF;
END$$

-- NEW: Audit trail for dropped/deleted enrollments
CREATE TRIGGER trg_enrollment_after_delete
AFTER DELETE ON ENROLLMENT
FOR EACH ROW
BEGIN
  DECLARE v_student_name VARCHAR(160);
  DECLARE v_course_code VARCHAR(50);

  SELECT s.name INTO v_student_name
  FROM STUDENT s WHERE s.student_id = OLD.student_id LIMIT 1;

  SELECT c.course_code INTO v_course_code
  FROM COURSE c WHERE c.course_id = OLD.course_id LIMIT 1;

  INSERT INTO ENROLLMENT_AUDIT_LOG (
    enrollment_id,
    student_id,
    course_id,
    student_name,
    course_code,
    enrolled_on,
    old_status
  ) VALUES (
    OLD.enrollment_id,
    OLD.student_id,
    OLD.course_id,
    v_student_name,
    v_course_code,
    OLD.enrolled_on,
    OLD.status
  );
END$$

DELIMITER ;

-- ==============================
-- Views
-- ==============================

-- Comprehensive student report view (joins all 7 core tables)
CREATE OR REPLACE VIEW student_report_view AS
SELECT
  s.student_id,
  s.name AS student_name,
  s.email AS student_email,
  s.semester,
  d.dept_name,
  c.course_id,
  c.course_code,
  c.title AS course_title,
  c.credits,
  f.name AS faculty_name,
  e.enrollment_id,
  e.enrolled_on,
  e.status AS enrollment_status,
  g.marks AS total_marks,
  calculate_attendance_percentage(e.enrollment_id) AS attendance_percentage,
  g.letter_grade AS current_letter_grade
FROM ENROLLMENT e
JOIN STUDENT s ON s.student_id = e.student_id
JOIN DEPARTMENT d ON d.dept_id = s.dept_id
JOIN COURSE c ON c.course_id = e.course_id
JOIN FACULTY f ON f.faculty_id = c.faculty_id
LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id;

-- NEW: Department statistics aggregate view
CREATE OR REPLACE VIEW dept_statistics_view AS
SELECT
  d.dept_id,
  d.dept_name,
  (SELECT COUNT(*) FROM STUDENT st WHERE st.dept_id = d.dept_id) AS student_count,
  (SELECT COUNT(*) FROM FACULTY fc WHERE fc.dept_id = d.dept_id) AS faculty_count,
  (SELECT COUNT(*) FROM COURSE cr WHERE cr.dept_id = d.dept_id) AS course_count,
  (SELECT COUNT(*) FROM ENROLLMENT e
   JOIN COURSE c ON c.course_id = e.course_id
   WHERE c.dept_id = d.dept_id AND e.status = 'active') AS active_enrollments,
  (SELECT ROUND(AVG(g.marks), 2)
   FROM GRADE g
   JOIN ENROLLMENT e ON e.enrollment_id = g.enrollment_id
   JOIN COURSE c ON c.course_id = e.course_id
   WHERE c.dept_id = d.dept_id AND g.marks IS NOT NULL) AS avg_marks,
  (SELECT ROUND(AVG(calculate_attendance_percentage(e2.enrollment_id)), 2)
   FROM ENROLLMENT e2
   JOIN COURSE c2 ON c2.course_id = e2.course_id
   WHERE c2.dept_id = d.dept_id AND e2.status = 'active') AS avg_attendance_pct
FROM DEPARTMENT d
ORDER BY d.dept_name;

-- NEW: Course workload summary view
CREATE OR REPLACE VIEW course_workload_view AS
SELECT
  c.course_id,
  c.course_code,
  c.title AS course_title,
  c.credits,
  d.dept_name,
  f.name AS faculty_name,
  (SELECT COUNT(*) FROM ENROLLMENT e WHERE e.course_id = c.course_id AND e.status = 'active') AS enrolled_count,
  (SELECT COUNT(*) FROM ENROLLMENT e
   JOIN GRADE g ON g.enrollment_id = e.enrollment_id
   WHERE e.course_id = c.course_id AND g.marks IS NOT NULL) AS graded_count,
  (SELECT ROUND(AVG(g2.marks), 2)
   FROM GRADE g2
   JOIN ENROLLMENT e2 ON e2.enrollment_id = g2.enrollment_id
   WHERE e2.course_id = c.course_id AND g2.marks IS NOT NULL) AS avg_marks,
  (SELECT ROUND(AVG(calculate_attendance_percentage(e3.enrollment_id)), 2)
   FROM ENROLLMENT e3
   WHERE e3.course_id = c.course_id AND e3.status = 'active') AS avg_attendance_pct
FROM COURSE c
JOIN DEPARTMENT d ON d.dept_id = c.dept_id
JOIN FACULTY f ON f.faculty_id = c.faculty_id
ORDER BY c.course_code;

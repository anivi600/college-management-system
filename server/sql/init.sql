-- College Management and Course Performance System (MySQL 8+)
-- Creates the 7 normalized tables plus required DB-level logic:
-- - enroll_student() stored procedure (atomic enrollment + blank grade row)
-- - BEFORE INSERT trigger on ENROLLMENT (secondary defense vs duplicates)
-- - assign_letter_grade() procedure (marks -> letter grade)
-- - GRADE audit trigger (logs before/after values)
-- - attendance aggregation function used by student_report_view

DROP DATABASE IF EXISTS college_management;
CREATE DATABASE college_management;
USE college_management;

-- --------------------
-- Core tables (7)
-- --------------------
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

-- --------------------
-- Audit table for GRADE updates
-- (MySQL triggers cannot write to "in-memory/session" structures.)
-- --------------------
CREATE TABLE GRADE_AUDIT_LOG (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  grade_id INT NOT NULL,
  old_marks DECIMAL(5,2) NULL,
  old_letter_grade VARCHAR(2) NULL,
  new_marks DECIMAL(5,2) NULL,
  new_letter_grade VARCHAR(2) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_grade
    FOREIGN KEY (grade_id) REFERENCES GRADE(grade_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------
-- Stored procedures & functions
-- --------------------
DELIMITER $$

-- Converts numeric marks into a letter grade (institution bands can be tuned)
CREATE PROCEDURE assign_letter_grade(IN p_marks DECIMAL(5,2), OUT p_letter_grade VARCHAR(2))
BEGIN
  IF p_marks IS NULL THEN
    SET p_letter_grade = NULL;
  ELSEIF p_marks >= 90 THEN
    SET p_letter_grade = 'A';
  ELSEIF p_marks >= 80 THEN
    SET p_letter_grade = 'B';
  ELSEIF p_marks >= 70 THEN
    SET p_letter_grade = 'C';
  ELSEIF p_marks >= 60 THEN
    SET p_letter_grade = 'D';
  ELSE
    SET p_letter_grade = 'F';
  END IF;
END$$

-- Atomic enrollment insertion + blank/default grade row
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

-- Attendance percentage calculator (function used by the view)
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

-- Optional procedure wrapper (CALLable version)
CREATE PROCEDURE calculate_attendance_percentage_proc(IN p_enrollment_id INT, OUT p_percentage DECIMAL(5,2))
BEGIN
  SET p_percentage = calculate_attendance_percentage(p_enrollment_id);
END$$

DELIMITER ;

-- --------------------
-- Triggers
-- --------------------
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

-- Audit old/new values on grade changes
CREATE TRIGGER trg_grade_after_update
AFTER UPDATE ON GRADE
FOR EACH ROW
BEGIN
  IF NOT (
    OLD.marks <=> NEW.marks
    AND OLD.letter_grade <=> NEW.letter_grade
  ) THEN
    INSERT INTO GRADE_AUDIT_LOG (
      grade_id,
      old_marks,
      old_letter_grade,
      new_marks,
      new_letter_grade
    ) VALUES (
      OLD.grade_id,
      OLD.marks,
      OLD.letter_grade,
      NEW.marks,
      NEW.letter_grade
    );
  END IF;
END$$

DELIMITER ;

-- --------------------
-- View: student_report_view
-- --------------------
CREATE OR REPLACE VIEW student_report_view AS
SELECT
  s.student_id,
  s.name AS student_name,
  c.course_id,
  c.course_code,
  c.title AS course_title,
  e.enrollment_id,
  e.status AS enrollment_status,
  g.marks AS total_marks,
  calculate_attendance_percentage(e.enrollment_id) AS attendance_percentage,
  g.letter_grade AS current_letter_grade
FROM ENROLLMENT e
JOIN STUDENT s ON s.student_id = e.student_id
JOIN COURSE c ON c.course_id = e.course_id
LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id;


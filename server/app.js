const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { query, pool } = require("./db");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// Simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// --------------------
// Departments
// --------------------
app.get("/departments", async (req, res, next) => {
  try {
    const rows = await query("SELECT dept_id, dept_name FROM DEPARTMENT ORDER BY dept_name", []);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/departments", async (req, res, next) => {
  try {
    const { deptName } = req.body;
    const result = await pool.execute(
      "INSERT INTO DEPARTMENT (dept_name) VALUES (?)",
      [deptName]
    );
    res.status(201).json({ deptId: result[0].insertId });
  } catch (err) {
    next(err);
  }
});

app.put("/departments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deptName } = req.body;
    await pool.execute("UPDATE DEPARTMENT SET dept_name = ? WHERE dept_id = ?", [deptName, id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/departments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM DEPARTMENT WHERE dept_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/departments/overview", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT d.dept_id,
              d.dept_name,
              (SELECT COUNT(*) FROM STUDENT s WHERE s.dept_id = d.dept_id) AS students_count,
              (SELECT COUNT(*) FROM FACULTY f WHERE f.dept_id = d.dept_id) AS faculty_count,
              (SELECT COUNT(*) FROM COURSE c WHERE c.dept_id = d.dept_id) AS courses_count
       FROM DEPARTMENT d
       ORDER BY d.dept_name`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --------------------
// Faculty
// --------------------
app.get("/faculty", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT f.faculty_id, f.name, f.email, d.dept_name
              ,f.dept_id
       FROM FACULTY f
       JOIN DEPARTMENT d ON d.dept_id = f.dept_id
       ORDER BY f.name`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/faculty", async (req, res, next) => {
  try {
    const { name, email, deptId } = req.body;
    const result = await pool.execute(
      "INSERT INTO FACULTY (name, email, dept_id) VALUES (?, ?, ?)",
      [name, email, deptId]
    );
    res.status(201).json({ facultyId: result[0].insertId });
  } catch (err) {
    next(err);
  }
});

app.put("/faculty/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, deptId } = req.body;
    await pool.execute(
      "UPDATE FACULTY SET name = ?, email = ?, dept_id = ? WHERE faculty_id = ?",
      [name, email, deptId, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/faculty/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM FACULTY WHERE faculty_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Students
// --------------------
app.get("/students", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT s.student_id, s.name, s.email, s.semester, d.dept_name
              ,s.dept_id
       FROM STUDENT s
       JOIN DEPARTMENT d ON d.dept_id = s.dept_id
       ORDER BY s.name`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/students", async (req, res, next) => {
  try {
    const { name, email, semester, deptId } = req.body;
    const result = await pool.execute(
      "INSERT INTO STUDENT (name, email, semester, dept_id) VALUES (?, ?, ?, ?)",
      [name, email, semester, deptId]
    );
    res.status(201).json({ studentId: result[0].insertId });
  } catch (err) {
    next(err);
  }
});

app.put("/students/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, semester, deptId } = req.body;
    await pool.execute(
      "UPDATE STUDENT SET name = ?, email = ?, semester = ?, dept_id = ? WHERE student_id = ?",
      [name, email, semester, deptId, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/students/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM STUDENT WHERE student_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Courses
// --------------------
app.get("/courses", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT c.course_id, c.course_code, c.title, c.credits, d.dept_name, f.name AS faculty_name
              ,c.dept_id, c.faculty_id
       FROM COURSE c
       JOIN DEPARTMENT d ON d.dept_id = c.dept_id
       JOIN FACULTY f ON f.faculty_id = c.faculty_id
       ORDER BY c.course_code`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/courses", async (req, res, next) => {
  try {
    const { courseCode, title, credits, facultyId, deptId } = req.body;
    const result = await pool.execute(
      "INSERT INTO COURSE (course_code, title, credits, faculty_id, dept_id) VALUES (?, ?, ?, ?, ?)",
      [courseCode, title, credits, facultyId, deptId]
    );
    res.status(201).json({ courseId: result[0].insertId });
  } catch (err) {
    next(err);
  }
});

app.put("/courses/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseCode, title, credits, facultyId, deptId } = req.body;
    await pool.execute(
      "UPDATE COURSE SET course_code = ?, title = ?, credits = ?, faculty_id = ?, dept_id = ? WHERE course_id = ?",
      [courseCode, title, credits, facultyId, deptId, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/courses/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM COURSE WHERE course_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Enrollments (uses enroll_student stored procedure)
// --------------------
app.get("/enrollments", async (req, res, next) => {
  try {
    const { studentId, courseId } = req.query;
    const where = [];
    const params = [];
    if (studentId) {
      where.push("e.student_id = ?");
      params.push(studentId);
    }
    if (courseId) {
      where.push("e.course_id = ?");
      params.push(courseId);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await query(
      `SELECT e.enrollment_id,
              s.student_id,
              s.name AS student_name,
              c.course_id,
              c.course_code,
              c.title AS course_title,
              e.enrolled_on,
              e.status,
              g.marks,
              g.letter_grade
       FROM ENROLLMENT e
       JOIN STUDENT s ON s.student_id = e.student_id
       JOIN COURSE c ON c.course_id = e.course_id
       LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id
       ${whereSql}
       ORDER BY e.enrolled_on DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/enrollments", async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;
    // Stored procedure handles ACID + grade row creation
    await pool.execute("CALL enroll_student(?, ?)", [studentId, courseId]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/enrollments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM ENROLLMENT WHERE enrollment_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Update enrollment status (uses update_enrollment_status stored procedure)
app.put("/enrollments/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.execute("CALL update_enrollment_status(?, ?)", [id, status]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Grades (update GRADE -> triggers audit + assign_letter_grade)
// --------------------
app.get("/grades", async (req, res, next) => {
  try {
    const { enrollmentId } = req.query;
    const rows = await query(
      `SELECT e.enrollment_id,
              s.student_id,
              s.name AS student_name,
              c.course_id,
              c.course_code,
              c.title AS course_title,
              g.marks,
              g.letter_grade,
              g.updated_at
       FROM ENROLLMENT e
       JOIN STUDENT s ON s.student_id = e.student_id
       JOIN COURSE c ON c.course_id = e.course_id
       LEFT JOIN GRADE g ON g.enrollment_id = e.enrollment_id
       WHERE (? IS NULL OR e.enrollment_id = ?)
       ORDER BY s.name`,
      [enrollmentId || null, enrollmentId || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.put("/grades", async (req, res, next) => {
  try {
    const { enrollmentId, marks } = req.body;
    await pool.execute(
      "UPDATE GRADE SET marks = ? WHERE enrollment_id = ?",
      [marks, enrollmentId]
    );

    const rows = await query(
      "SELECT enrollment_id, marks, letter_grade, updated_at FROM GRADE WHERE enrollment_id = ?",
      [enrollmentId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

// Bulk assign letter grades for a course (uses bulk_assign_grades procedure)
app.post("/grades/bulk/:courseId", async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await pool.execute("CALL bulk_assign_grades(?)", [courseId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Attendance (batch insert for course + class_date)
// --------------------
app.post("/attendance/batch", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { courseId, classDate, records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "`records` must be an array" });
    }

    await conn.beginTransaction();

    for (const rec of records) {
      const { studentId, status } = rec;
      // Map student+course -> enrollment_id
      const [enrollRows] = await conn.execute(
        "SELECT enrollment_id FROM ENROLLMENT WHERE student_id = ? AND course_id = ? AND status = 'active' LIMIT 1",
        [studentId, courseId]
      );

      if (!enrollRows.length) {
        throw new Error(`No active enrollment for studentId=${studentId} courseId=${courseId}`);
      }

      const enrollmentId = enrollRows[0].enrollment_id;
      await conn.execute(
        `INSERT INTO ATTENDANCE (enrollment_id, class_date, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [enrollmentId, classDate, status]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// --------------------
// Dashboard / Report (uses student_report_view)
// --------------------
app.get("/report", async (req, res, next) => {
  try {
    const { studentId } = req.query;
    const where = studentId ? "WHERE student_id = ?" : "";
    const params = studentId ? [studentId] : [];

    const rows = await query(
      `SELECT *
       FROM student_report_view
       ${where}`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --------------------
// Dashboard summary counts
// --------------------
app.get("/dashboard/counts", async (req, res, next) => {
  try {
    const [students] = await query("SELECT COUNT(*) AS c FROM STUDENT", []);
    const [faculty] = await query("SELECT COUNT(*) AS c FROM FACULTY", []);
    const [courses] = await query("SELECT COUNT(*) AS c FROM COURSE", []);
    const [enrollments] = await query("SELECT COUNT(*) AS c FROM ENROLLMENT WHERE status = 'active'", []);
    res.json({
      students: students?.c ?? 0,
      faculty: faculty?.c ?? 0,
      courses: courses?.c ?? 0,
      enrollments: enrollments?.c ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// --------------------
// Analytics endpoints
// --------------------

// Department statistics (uses dept_statistics_view)
app.get("/analytics/department-stats", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM dept_statistics_view", []);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Top students for a course (uses get_top_students stored procedure)
app.get("/analytics/top-students", async (req, res, next) => {
  try {
    const courseId = Number(req.query.courseId) || 1;
    const limit = Number(req.query.limit) || 10;
    const [rows] = await pool.execute("CALL get_top_students(?, ?)", [courseId, limit]);
    res.json(rows[0] || []);
  } catch (err) {
    next(err);
  }
});

// Students at risk (uses get_students_at_risk stored procedure)
app.get("/analytics/at-risk", async (req, res, next) => {
  try {
    const minAttendance = Number(req.query.minAttendance) || 75;
    const minMarks = Number(req.query.minMarks) || 60;
    const [rows] = await pool.execute("CALL get_students_at_risk(?, ?)", [minAttendance, minMarks]);
    res.json(rows[0] || []);
  } catch (err) {
    next(err);
  }
});

// Course workload summary (uses course_workload_view)
app.get("/analytics/course-workload", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM course_workload_view", []);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Student transcript (uses get_student_transcript stored procedure)
app.get("/analytics/transcript/:studentId", async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const [rows] = await pool.execute("CALL get_student_transcript(?)", [studentId]);
    res.json(rows[0] || []);
  } catch (err) {
    next(err);
  }
});

// --------------------
// Audit log endpoints
// --------------------

// Grade audit log
app.get("/audit/grades", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT audit_id, grade_id, enrollment_id, student_name, course_code,
              old_marks, old_letter_grade, new_marks, new_letter_grade, changed_at
       FROM GRADE_AUDIT_LOG
       ORDER BY changed_at DESC
       LIMIT 100`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Enrollment audit log
app.get("/audit/enrollments", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT audit_id, enrollment_id, student_id, course_id, student_name,
              course_code, enrolled_on, old_status, dropped_at
       FROM ENROLLMENT_AUDIT_LOG
       ORDER BY dropped_at DESC
       LIMIT 100`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --------------------
// Error handler
// --------------------
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const message = err?.message || "Unexpected error";
  res.status(400).json({ error: message });
});

module.exports = app;

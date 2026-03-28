import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function statusBadge(s) {
  const cls = s === "active" ? "badge-active" : s === "completed" ? "badge-completed" : "badge-dropped";
  return <span className={`badge ${cls}`}>{s}</span>;
}

function gradeBadge(letter) {
  if (!letter) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const l = letter.toLowerCase().replace("+", "");
  const cls = l === "a" ? "badge-grade-a" : l === "b" ? "badge-grade-b" : l === "c" ? "badge-grade-c" : l === "d" ? "badge-grade-d" : "badge-grade-f";
  return <span className={`badge ${cls}`}>{letter}</span>;
}

export default function EnrollmentsPage() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ studentId: "", courseId: "" });
  const [filterCourseId, setFilterCourseId] = useState("");

  async function loadBasics() {
    setError("");
    const [studentsRes, coursesRes] = await Promise.all([api.get("/students"), api.get("/courses")]);
    setStudents(studentsRes.data || []);
    setCourses(coursesRes.data || []);
  }

  async function loadEnrollments() {
    const params = filterCourseId ? { courseId: filterCourseId } : {};
    const res = await api.get("/enrollments", { params });
    setRows(res.data || []);
  }

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        await loadBasics();
        if (!alive) return;
        await loadEnrollments();
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load enrollments");
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    loadEnrollments().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
  }, [filterCourseId]);

  async function enroll(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/enrollments", { studentId: form.studentId, courseId: form.courseId });
      setForm({ studentId: "", courseId: "" });
      await loadEnrollments();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to enroll");
    }
  }

  async function dropEnrollment(enrollmentId) {
    setError("");
    try {
      await api.delete(`/enrollments/${enrollmentId}`);
      await loadEnrollments();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to delete enrollment");
    }
  }

  async function updateStatus(enrollmentId, newStatus) {
    setError("");
    try {
      await api.put(`/enrollments/${enrollmentId}/status`, { status: newStatus });
      await loadEnrollments();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to update status");
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Enrollments</h2>
        <p className="page-desc">Enroll students via <code>enroll_student()</code> stored procedure — atomic ACID transaction</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Enroll Student</div>
          <form onSubmit={enroll}>
            <div className="field">
              <label htmlFor="enroll-student">Student</label>
              <select id="enroll-student" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required>
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="enroll-course">Course</label>
              <select id="enroll-course" value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} required>
                <option value="">Select course…</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.title}</option>
                ))}
              </select>
            </div>
            <button type="submit">Enroll Student</button>
          </form>

          <div className="divider" />

          <div className="card-title" style={{ marginBottom: 12 }}>Filter</div>
          <div className="field">
            <label htmlFor="filter-course">Filter by course</label>
            <select id="filter-course" value={filterCourseId} onChange={(e) => setFilterCourseId(e.target.value)}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Enrollment Records</div>
          <div className="table-wrapper">
            <table className="table" aria-label="enrollments table" id="enrollments-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.enrollment_id}>
                    <td><strong>{r.student_name}</strong></td>
                    <td>{r.course_code} — {r.course_title}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{r.enrolled_on ? new Date(r.enrolled_on).toLocaleDateString() : "—"}</td>
                    <td className="data-value">{r.marks ?? "—"}</td>
                    <td>{gradeBadge(r.letter_grade)}</td>
                    <td>
                      <div className="actions-row">
                        {r.status === "active" && (
                          <button className="secondary" type="button" onClick={() => updateStatus(r.enrollment_id, "completed")}>
                            Complete
                          </button>
                        )}
                        <button className="danger" type="button" onClick={() => dropEnrollment(r.enrollment_id)}>
                          Drop
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan="7"><div className="empty-state"><p>No enrollments found.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

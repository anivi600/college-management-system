import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function gradeBadge(letter) {
  if (!letter) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const l = letter.toLowerCase().replace("+", "");
  const cls = l === "a" ? "badge-grade-a" : l === "b" ? "badge-grade-b" : l === "c" ? "badge-grade-c" : l === "d" ? "badge-grade-d" : "badge-grade-f";
  return <span className={`badge ${cls}`}>{letter}</span>;
}

export default function GradesPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [marksDraft, setMarksDraft] = useState({});

  async function loadCourses() {
    const res = await api.get("/courses");
    setCourses(res.data || []);
  }

  async function loadEnrollmentsForCourse() {
    const params = courseId ? { courseId } : {};
    const res = await api.get("/enrollments", { params });
    setEnrollments(res.data || []);
  }

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        await loadCourses();
        if (!alive) return;
        await loadEnrollmentsForCourse();
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load");
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setError("");
    setSuccess("");
    loadEnrollmentsForCourse().catch((e) => {
      setError(e?.response?.data?.error || e.message || "Failed to load enrollments");
    });
  }, [courseId]);

  async function updateGrade(enrollment_id) {
    setError("");
    setSuccess("");
    try {
      const marks = marksDraft[enrollment_id];
      await api.put("/grades", { enrollmentId: enrollment_id, marks: Number(marks) });
      setMarksDraft((d) => ({ ...d, [enrollment_id]: "" }));
      setSuccess("Grade updated — trigger auto-assigned letter grade and logged to audit.");
      await loadEnrollmentsForCourse();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to update grade");
    }
  }

  async function bulkAssign() {
    if (!courseId) return;
    setError("");
    setSuccess("");
    try {
      await api.post(`/grades/bulk/${courseId}`);
      setSuccess("Bulk letter grades assigned via stored procedure.");
      await loadEnrollmentsForCourse();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to bulk assign");
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Grades</h2>
        <p className="page-desc">Update marks — triggers auto-assign letter grades via <code>trg_grade_before_update</code> and log changes to <code>GRADE_AUDIT_LOG</code></p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ alignItems: "flex-end", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="grade-course-filter">Filter by course</label>
              <select id="grade-course-filter" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.title}</option>
                ))}
              </select>
            </div>
          </div>
          {courseId && (
            <button type="button" onClick={bulkAssign} className="secondary">
              Bulk Re-assign Grades
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Grade Sheet</div>
        <div className="table-wrapper">
          <table className="table" aria-label="grades table" id="grades-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Current Marks</th>
                <th>Letter Grade</th>
                <th>New Marks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.enrollment_id}>
                  <td><strong>{e.student_name}</strong></td>
                  <td>{e.course_code}</td>
                  <td className="data-value">{e.marks ?? "—"}</td>
                  <td>{gradeBadge(e.letter_grade)}</td>
                  <td style={{ minWidth: 140 }}>
                    <input
                      value={marksDraft[e.enrollment_id] ?? ""}
                      placeholder="0–100"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      onChange={(ev) => setMarksDraft((d) => ({ ...d, [e.enrollment_id]: ev.target.value }))}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => updateGrade(e.enrollment_id)} disabled={!marksDraft[e.enrollment_id]}>
                      Update
                    </button>
                  </td>
                </tr>
              ))}
              {!enrollments.length && (
                <tr><td colSpan="6"><div className="empty-state"><p>No enrollments to grade.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

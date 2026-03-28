import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [classDate, setClassDate] = useState(new Date().toISOString().slice(0, 10));
  const [enrollments, setEnrollments] = useState([]);
  const [statusDraft, setStatusDraft] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCourses() {
    const res = await api.get("/courses");
    setCourses(res.data || []);
  }

  async function loadEnrollments() {
    const params = courseId ? { courseId } : {};
    const res = await api.get("/enrollments", { params });
    setEnrollments((res.data || []).filter((x) => x.status === "active"));
    setStatusDraft((d) => {
      const next = { ...d };
      for (const e of res.data || []) {
        if (!next[e.enrollment_id]) next[e.enrollment_id] = "present";
      }
      return next;
    });
  }

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setSuccess("");
        await loadCourses();
        if (!alive) return;
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load courses");
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setError("");
    setSuccess("");
    loadEnrollments().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load enrollments"));
  }, [courseId]);

  const courseLabel = useMemo(() => {
    if (!courseId) return "";
    return courses.find((c) => String(c.course_id) === String(courseId))?.course_code || "";
  }, [courseId, courses]);

  async function submitBatch() {
    if (!courseId) return;
    setError("");
    setSuccess("");
    try {
      const records = enrollments.map((e) => ({
        studentId: e.student_id,
        status: statusDraft[e.enrollment_id] || "present",
      }));
      await api.post("/attendance/batch", { courseId, classDate, records });
      setSuccess(`Attendance saved for ${courseLabel} on ${classDate} (ACID batch transaction).`);
      await loadEnrollments();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to submit attendance");
    }
  }

  function markAll(status) {
    setStatusDraft((d) => {
      const next = { ...d };
      for (const e of enrollments) {
        next[e.enrollment_id] = status;
      }
      return next;
    });
  }

  return (
    <>
      <div className="page-header">
        <h2>Attendance</h2>
        <p className="page-desc">Batch insert attendance via ACID transaction — tracked per <code>(enrollment_id, class_date)</code></p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ alignItems: "flex-end", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="att-course">Course</label>
              <select id="att-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Select course…</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ minWidth: 180 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="att-date">Class Date</label>
              <input id="att-date" type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {courseLabel ? `Attendance — ${courseLabel} · ${classDate}` : "Select a course"}
          </span>
          {enrollments.length > 0 && (
            <div className="actions-row">
              <button type="button" className="ghost" onClick={() => markAll("present")}>All Present</button>
              <button type="button" className="ghost" onClick={() => markAll("absent")}>All Absent</button>
            </div>
          )}
        </div>

        <div className="table-wrapper">
          <table className="table" aria-label="attendance table" id="attendance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.enrollment_id}>
                  <td><strong>{e.student_name}</strong></td>
                  <td style={{ minWidth: 200 }}>
                    <select
                      value={statusDraft[e.enrollment_id] || "present"}
                      onChange={(ev) => setStatusDraft((d) => ({ ...d, [e.enrollment_id]: ev.target.value }))}
                    >
                      <option value="present">✓ Present</option>
                      <option value="absent">✗ Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!enrollments.length && (
                <tr><td colSpan="2"><div className="empty-state"><p>Select a course to view enrolled students.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {enrollments.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={submitBatch}>
              Submit Batch Attendance
            </button>
          </div>
        )}
      </div>
    </>
  );
}

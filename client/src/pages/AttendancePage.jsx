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
    // For attendance we need student_name + enrollment_id mapping
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
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setError("");
    setSuccess("");
    loadEnrollments().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load enrollments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSuccess("Attendance saved successfully.");
      await loadEnrollments();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to submit attendance");
    }
  }

  return (
    <div className="card">
      <h2>Attendance</h2>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {success ? <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 12 }}>{success}</div> : null}

      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="col">
          <div className="field">
            <label>Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select...</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="col">
          <div className="field">
            <label>Class Date</label>
            <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="hint" style={{ marginBottom: 10 }}>
        Mark attendance for {courseLabel || "selected course"} on {classDate}.
      </div>

      <table className="table" aria-label="attendance table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.enrollment_id}>
              <td>{e.student_name}</td>
              <td style={{ minWidth: 220 }}>
                <select
                  value={statusDraft[e.enrollment_id] || "present"}
                  onChange={(ev) => setStatusDraft((d) => ({ ...d, [e.enrollment_id]: ev.target.value }))}
                >
                  <option value="present">present</option>
                  <option value="absent">absent</option>
                </select>
              </td>
            </tr>
          ))}
          {!enrollments.length ? (
            <tr>
              <td colSpan="2" style={{ color: "var(--muted)" }}>
                Select a course to view enrolled students.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={submitBatch} disabled={!courseId || !enrollments.length}>
          Submit batch attendance
        </button>
      </div>
    </div>
  );
}


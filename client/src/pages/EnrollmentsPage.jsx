import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

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
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEnrollments().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourseId]);

  async function enroll(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/enrollments", {
        studentId: form.studentId,
        courseId: form.courseId,
      });
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

  const selectedCourse = useMemo(() => courses.find((c) => String(c.course_id) === String(filterCourseId)), [courses, filterCourseId]);

  return (
    <div className="card">
      <h2>Enrollments</h2>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row">
        <div className="col">
          <form onSubmit={enroll}>
            <div className="field">
              <label>Student</label>
              <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
                <option value="">Select...</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Course</label>
              <select value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}>
                <option value="">Select...</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_code} - {c.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Enroll student</button>
          </form>
        </div>

        <div className="col">
          <div className="field">
            <label>Filter enrollments by course</label>
            <select value={filterCourseId} onChange={(e) => setFilterCourseId(e.target.value)}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="hint">
            {selectedCourse ? `Showing enrollments for: ${selectedCourse.course_code}` : "Showing enrollments for: all courses"}
          </div>
        </div>
      </div>

      <table className="table" aria-label="enrollments table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Status</th>
            <th>Enrolled On</th>
            <th>Marks</th>
            <th>Letter</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.enrollment_id}>
              <td>{r.student_name}</td>
              <td>{r.course_code} - {r.course_title}</td>
              <td>{r.status}</td>
              <td>{r.enrolled_on}</td>
              <td>{r.marks ?? "-"}</td>
              <td>{r.letter_grade ?? "-"}</td>
              <td>
                <button className="danger" type="button" onClick={() => dropEnrollment(r.enrollment_id)}>
                  Drop
                </button>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan="7" style={{ color: "var(--muted)" }}>
                No enrollments found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


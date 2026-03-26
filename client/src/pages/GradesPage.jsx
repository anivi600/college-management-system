import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function GradesPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");

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
        setError(e?.response?.data?.error || e.message || "Failed to load courses/enrollments");
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setError("");
    loadEnrollmentsForCourse().catch((e) => {
      setError(e?.response?.data?.error || e.message || "Failed to load enrollments");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const filteredTitle = useMemo(() => {
    if (!courseId) return "All courses";
    return courses.find((c) => String(c.course_id) === String(courseId))?.course_code || "Course";
  }, [courseId, courses]);

  async function updateGrade(enrollment_id) {
    setError("");
    try {
      const marks = marksDraft[enrollment_id];
      await api.put("/grades", { enrollmentId: enrollment_id, marks: Number(marks) });
      setMarksDraft((d) => ({ ...d, [enrollment_id]: "" }));
      await loadEnrollmentsForCourse();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to update grade");
    }
  }

  return (
    <div className="card">
      <h2>Grades</h2>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="col">
          <div className="field">
            <label>Filter by course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="hint">Lazy-loaded route: grades (per PRD).</div>
        </div>
      </div>

      <table className="table" aria-label="grades table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Current Marks</th>
            <th>Current Letter</th>
            <th>Update Marks</th>
            <th>Apply</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.enrollment_id}>
              <td>{e.student_name}</td>
              <td>{e.course_code}</td>
              <td>{e.marks ?? "-"}</td>
              <td>{e.letter_grade ?? "-"}</td>
              <td style={{ minWidth: 160 }}>
                <input
                  value={marksDraft[e.enrollment_id] ?? ""}
                  placeholder="e.g., 87.5"
                  onChange={(ev) =>
                    setMarksDraft((d) => ({ ...d, [e.enrollment_id]: ev.target.value }))
                  }
                />
              </td>
              <td>
                <button type="button" onClick={() => updateGrade(e.enrollment_id)}>
                  Update
                </button>
              </td>
            </tr>
          ))}
          {!enrollments.length ? (
            <tr>
              <td colSpan="6" style={{ color: "var(--muted)" }}>
                No enrollments to grade for {filteredTitle}.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


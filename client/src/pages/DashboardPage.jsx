import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function DashboardPage() {
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setError("");
      try {
        const [studentsRes, reportRes] = await Promise.all([
          api.get("/students"),
          api.get("/report"),
        ]);
        if (!alive) return;
        setStudents(studentsRes.data || []);
        setRows(reportRes.data || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load report");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const sid = studentId ? Number(studentId) : null;
    if (!sid) return rows;
    return rows.filter((r) => Number(r.student_id) === sid);
  }, [rows, studentId]);

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="col">
          <div className="field">
            <label>Filter by student (optional)</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}

      <table className="table" aria-label="student report table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Total Marks</th>
            <th>Attendance %</th>
            <th>Letter Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.enrollment_id}>
              <td>{r.student_name}</td>
              <td>{r.course_code} - {r.course_title}</td>
              <td>{r.total_marks ?? "-"}</td>
              <td>{r.attendance_percentage ?? 0}</td>
              <td>{r.current_letter_grade ?? "-"}</td>
              <td>{r.enrollment_status}</td>
            </tr>
          ))}
          {!filtered.length ? (
            <tr>
              <td colSpan="6" style={{ color: "var(--muted)" }}>
                No report data yet. Enroll students and submit attendance/grades.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


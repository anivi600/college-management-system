import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function gradeBadge(letter) {
  if (!letter) return <span className="badge badge-info">—</span>;
  const l = letter.toLowerCase().replace("+", "");
  const cls = l === "a" ? "badge-grade-a" : l === "b" ? "badge-grade-b" : l === "c" ? "badge-grade-c" : l === "d" ? "badge-grade-d" : "badge-grade-f";
  return <span className={`badge ${cls}`}>{letter}</span>;
}

function statusBadge(s) {
  const cls = s === "active" ? "badge-active" : s === "completed" ? "badge-completed" : "badge-dropped";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export default function DashboardPage() {
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ students: 0, faculty: 0, courses: 0, enrollments: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setError("");
      try {
        const [studentsRes, reportRes, countsRes] = await Promise.all([
          api.get("/students"),
          api.get("/report"),
          api.get("/dashboard/counts"),
        ]);
        if (!alive) return;
        setStudents(studentsRes.data || []);
        setRows(reportRes.data || []);
        setCounts(countsRes.data || {});
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load report");
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const sid = studentId ? Number(studentId) : null;
    if (!sid) return rows;
    return rows.filter((r) => Number(r.student_id) === sid);
  }, [rows, studentId]);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-desc">Overview of college performance powered by <code>student_report_view</code></p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="stat-value">{counts.students}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div className="stat-value">{counts.faculty}</div>
          <div className="stat-label">Faculty</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          </div>
          <div className="stat-value">{counts.courses}</div>
          <div className="stat-label">Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>
          </div>
          <div className="stat-value">{counts.enrollments}</div>
          <div className="stat-label">Active Enrollments</div>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Student Performance Report</span>
          <div style={{ minWidth: 200 }}>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} id="dashboard-filter">
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-wrapper">
          <table className="table" aria-label="student report table" id="dashboard-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Faculty</th>
                <th>Marks</th>
                <th>Attendance</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.enrollment_id}>
                  <td><strong>{r.student_name}</strong></td>
                  <td>{r.course_code} — {r.course_title}</td>
                  <td>{r.faculty_name || "—"}</td>
                  <td className="data-value">{r.total_marks ?? "—"}</td>
                  <td>
                    <span className="data-value" style={{ color: (r.attendance_percentage ?? 0) < 75 ? "var(--danger)" : "var(--success)" }}>
                      {r.attendance_percentage ?? 0}%
                    </span>
                  </td>
                  <td>{gradeBadge(r.current_letter_grade)}</td>
                  <td>{statusBadge(r.enrollment_status)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <p>No report data yet. Enroll students and submit attendance/grades.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

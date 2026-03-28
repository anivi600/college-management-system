import React, { useEffect, useState } from "react";
import api from "../api";

function gradeBadge(letter) {
  if (!letter) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const l = letter.toLowerCase().replace("+", "");
  const cls = l === "a" ? "badge-grade-a" : l === "b" ? "badge-grade-b" : l === "c" ? "badge-grade-c" : l === "d" ? "badge-grade-d" : "badge-grade-f";
  return <span className={`badge ${cls}`}>{letter}</span>;
}

export default function AnalyticsPage() {
  const [deptStats, setDeptStats] = useState([]);
  const [courseWorkload, setCourseWorkload] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [ds, cw, ar, cs, st] = await Promise.all([
          api.get("/analytics/department-stats"),
          api.get("/analytics/course-workload"),
          api.get("/analytics/at-risk"),
          api.get("/courses"),
          api.get("/students"),
        ]);
        if (!alive) return;
        setDeptStats(ds.data || []);
        setCourseWorkload(cw.data || []);
        setAtRisk(ar.data || []);
        setCourses(cs.data || []);
        setStudents(st.data || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed");
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setTopStudents([]); return; }
    api.get("/analytics/top-students", { params: { courseId: selectedCourse, limit: 10 } })
      .then((r) => setTopStudents(r.data || []))
      .catch((e) => setError(e?.response?.data?.error || e.message));
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedStudent) { setTranscript([]); return; }
    api.get(`/analytics/transcript/${selectedStudent}`)
      .then((r) => setTranscript(r.data || []))
      .catch((e) => setError(e?.response?.data?.error || e.message));
  }, [selectedStudent]);

  return (
    <>
      <div className="page-header">
        <h2>Analytics</h2>
        <p className="page-desc">Advanced DBMS queries — stored procedures, aggregate views, multi-table joins</p>
      </div>
      {error && <div className="error-message">{error}</div>}

      {/* Dept Stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Department Statistics <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>— <code>dept_statistics_view</code></span></div>
        <div className="table-wrapper">
          <table className="table" id="dept-stats-table">
            <thead><tr><th>Department</th><th>Students</th><th>Faculty</th><th>Courses</th><th>Enrollments</th><th>Avg Marks</th><th>Avg Attendance</th></tr></thead>
            <tbody>
              {deptStats.map((d) => (
                <tr key={d.dept_id}>
                  <td><strong>{d.dept_name}</strong></td>
                  <td className="data-value">{d.student_count}</td>
                  <td className="data-value">{d.faculty_count}</td>
                  <td className="data-value">{d.course_count}</td>
                  <td className="data-value">{d.active_enrollments}</td>
                  <td className="data-value">{d.avg_marks ?? "—"}</td>
                  <td><span className="data-value" style={{ color: (d.avg_attendance_pct ?? 0) < 75 ? "var(--danger)" : "var(--success)" }}>{d.avg_attendance_pct ?? 0}%</span></td>
                </tr>
              ))}
              {!deptStats.length && <tr><td colSpan="7"><div className="empty-state"><p>No data.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Workload */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Course Workload <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>— <code>course_workload_view</code></span></div>
        <div className="table-wrapper">
          <table className="table" id="course-workload-table">
            <thead><tr><th>Course</th><th>Credits</th><th>Faculty</th><th>Dept</th><th>Enrolled</th><th>Graded</th><th>Avg Marks</th><th>Avg Att.</th></tr></thead>
            <tbody>
              {courseWorkload.map((c) => (
                <tr key={c.course_id}>
                  <td><strong>{c.course_code}</strong> — {c.course_title}</td>
                  <td><span className="badge badge-info">{c.credits}</span></td>
                  <td>{c.faculty_name}</td><td>{c.dept_name}</td>
                  <td className="data-value">{c.enrolled_count}</td>
                  <td className="data-value">{c.graded_count}</td>
                  <td className="data-value">{c.avg_marks ?? "—"}</td>
                  <td><span className="data-value" style={{ color: (c.avg_attendance_pct ?? 0) < 75 ? "var(--danger)" : "var(--success)" }}>{c.avg_attendance_pct ?? 0}%</span></td>
                </tr>
              ))}
              {!courseWorkload.length && <tr><td colSpan="8"><div className="empty-state"><p>No data.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Students */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Top Students <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>— <code>get_top_students()</code></span></div>
          <div style={{ minWidth: 220 }}>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">Select course…</option>
              {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.title}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table" id="top-students-table">
            <thead><tr><th>#</th><th>Student</th><th>Marks</th><th>Grade</th><th>Attendance</th></tr></thead>
            <tbody>
              {topStudents.map((s, i) => (
                <tr key={s.student_id}><td className="data-value">{i + 1}</td><td><strong>{s.student_name}</strong></td><td className="data-value">{s.marks}</td><td>{gradeBadge(s.letter_grade)}</td><td><span className="data-value" style={{ color: (s.attendance_pct ?? 0) < 75 ? "var(--danger)" : "var(--success)" }}>{s.attendance_pct ?? 0}%</span></td></tr>
              ))}
              {!topStudents.length && <tr><td colSpan="5"><div className="empty-state"><p>{selectedCourse ? "No graded students." : "Select a course."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* At Risk */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Students at Risk <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>— <code>get_students_at_risk(75, 60)</code></span></div>
        <div className="table-wrapper">
          <table className="table" id="at-risk-table">
            <thead><tr><th>Student</th><th>Dept</th><th>Course</th><th>Marks</th><th>Attendance</th><th>Risk</th></tr></thead>
            <tbody>
              {atRisk.map((s, i) => (
                <tr key={`${s.student_id}-${s.course_code}-${i}`}>
                  <td><strong>{s.student_name}</strong></td><td>{s.dept_name}</td><td>{s.course_code}</td>
                  <td className="data-value">{s.marks ?? "—"}</td>
                  <td><span className="data-value" style={{ color: "var(--danger)" }}>{s.attendance_pct ?? 0}%</span></td>
                  <td><span className="badge badge-dropped">{s.risk_reason}</span></td>
                </tr>
              ))}
              {!atRisk.length && <tr><td colSpan="6"><div className="empty-state"><p>No at-risk students 🎉</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Student Transcript <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>— <code>get_student_transcript()</code></span></div>
          <div style={{ minWidth: 220 }}>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
              <option value="">Select student…</option>
              {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {transcript.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-value" style={{ color: "var(--accent)", fontSize: 20 }}>{transcript[0]?.student_name}</div><div className="stat-label">{transcript[0]?.semester} · {transcript[0]?.dept_name}</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: "var(--success)", fontSize: 20 }}>{transcript.length}</div><div className="stat-label">Courses Enrolled</div></div>
          </div>
        )}
        <div className="table-wrapper">
          <table className="table" id="transcript-table">
            <thead><tr><th>Course</th><th>Faculty</th><th>Marks</th><th>Grade</th><th>Attendance</th><th>Status</th></tr></thead>
            <tbody>
              {transcript.map((t) => (
                <tr key={t.enrollment_id}>
                  <td><strong>{t.course_code}</strong> — {t.course_title}</td><td>{t.faculty_name}</td>
                  <td className="data-value">{t.marks ?? "—"}</td><td>{gradeBadge(t.letter_grade)}</td>
                  <td><span className="data-value" style={{ color: (t.attendance_pct ?? 0) < 75 ? "var(--danger)" : "var(--success)" }}>{t.attendance_pct ?? 0}%</span> <span className="hint">({t.classes_attended ?? 0}/{t.total_classes ?? 0})</span></td>
                  <td><span className={`badge ${t.enrollment_status === "active" ? "badge-active" : t.enrollment_status === "completed" ? "badge-completed" : "badge-dropped"}`}>{t.enrollment_status}</span></td>
                </tr>
              ))}
              {!transcript.length && <tr><td colSpan="6"><div className="empty-state"><p>{selectedStudent ? "No data." : "Select a student."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

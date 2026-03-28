import React, { useEffect, useState } from "react";
import api from "../api";

function gradeBadge(letter) {
  if (!letter) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const l = letter.toLowerCase().replace("+", "");
  const cls = l === "a" ? "badge-grade-a" : l === "b" ? "badge-grade-b" : l === "c" ? "badge-grade-c" : l === "d" ? "badge-grade-d" : "badge-grade-f";
  return <span className={`badge ${cls}`}>{letter}</span>;
}

export default function GradeAuditPage() {
  const [gradeAudit, setGradeAudit] = useState([]);
  const [enrollAudit, setEnrollAudit] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("grades");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [ga, ea] = await Promise.all([
          api.get("/audit/grades"),
          api.get("/audit/enrollments"),
        ]);
        if (!alive) return;
        setGradeAudit(ga.data || []);
        setEnrollAudit(ea.data || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load audit logs");
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>Audit Logs</h2>
        <p className="page-desc">
          Database-level audit trail powered by MySQL triggers —
          <code>trg_grade_after_update</code> and <code>trg_enrollment_after_delete</code>
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Tab Switcher */}
      <div className="actions-row" style={{ marginBottom: 20 }}>
        <button
          className={tab === "grades" ? "" : "secondary"}
          onClick={() => setTab("grades")}
          type="button"
        >
          Grade Changes ({gradeAudit.length})
        </button>
        <button
          className={tab === "enrollments" ? "" : "secondary"}
          onClick={() => setTab("enrollments")}
          type="button"
        >
          Dropped Enrollments ({enrollAudit.length})
        </button>
      </div>

      {/* Grade Audit Log */}
      {tab === "grades" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            Grade Audit Log
            <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>
              — populated by <code>AFTER UPDATE</code> trigger on <code>GRADE</code>
            </span>
          </div>
          <div className="table-wrapper">
            <table className="table" id="grade-audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Old Marks</th>
                  <th>Old Grade</th>
                  <th>→</th>
                  <th>New Marks</th>
                  <th>New Grade</th>
                </tr>
              </thead>
              <tbody>
                {gradeAudit.map((a) => (
                  <tr key={a.audit_id}>
                    <td className="hint">
                      {a.changed_at ? new Date(a.changed_at).toLocaleString() : "—"}
                    </td>
                    <td><strong>{a.student_name || `Enrollment #${a.enrollment_id}`}</strong></td>
                    <td>{a.course_code || "—"}</td>
                    <td className="data-value">{a.old_marks ?? "—"}</td>
                    <td>{gradeBadge(a.old_letter_grade)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 16 }}>→</td>
                    <td className="data-value">{a.new_marks ?? "—"}</td>
                    <td>{gradeBadge(a.new_letter_grade)}</td>
                  </tr>
                ))}
                {!gradeAudit.length && (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-state">
                        <p>No grade changes logged yet. Update a student's marks to see the audit trail.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollment Audit Log */}
      {tab === "enrollments" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            Enrollment Deletion Log
            <span className="hint" style={{ marginLeft: 8, textTransform: "none", fontWeight: 400 }}>
              — populated by <code>AFTER DELETE</code> trigger on <code>ENROLLMENT</code>
            </span>
          </div>
          <div className="table-wrapper">
            <table className="table" id="enrollment-audit-table">
              <thead>
                <tr>
                  <th>Dropped At</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Enrolled On</th>
                  <th>Previous Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollAudit.map((a) => (
                  <tr key={a.audit_id}>
                    <td className="hint">
                      {a.dropped_at ? new Date(a.dropped_at).toLocaleString() : "—"}
                    </td>
                    <td><strong>{a.student_name || `Student #${a.student_id}`}</strong></td>
                    <td>{a.course_code || `Course #${a.course_id}`}</td>
                    <td>{a.enrolled_on ? new Date(a.enrolled_on).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className={`badge ${a.old_status === "active" ? "badge-active" : a.old_status === "completed" ? "badge-completed" : "badge-dropped"}`}>
                        {a.old_status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!enrollAudit.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <p>No enrollment deletions logged yet. Drop an enrollment to see the audit trail.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

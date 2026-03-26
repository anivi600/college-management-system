import React, { useEffect, useState } from "react";
import api from "../api";

export default function DepartmentsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [deptName, setDeptName] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setError("");
      setSuccess("");
      try {
        const res = await api.get("/departments/overview");
        if (!alive) return;
        setRows(res.data || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || e.message || "Failed to load departments");
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  async function addDepartment(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/departments", { deptName });
      setDeptName("");
      setSuccess("Department added.");
      const res = await api.get("/departments/overview");
      setRows(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to add department");
    }
  }

  async function removeDepartment(deptId) {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/departments/${deptId}`);
      setSuccess("Department deleted.");
      const res = await api.get("/departments/overview");
      setRows(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to delete department");
    }
  }

  return (
    <div className="card">
      <h2>Departmental Overview</h2>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {success ? <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 12 }}>{success}</div> : null}

      <form onSubmit={addDepartment} style={{ marginBottom: 14 }}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="col">
            <div className="field">
              <label>Add Department</label>
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g., Physics"
                required
              />
            </div>
          </div>
          <div className="col" style={{ minWidth: 160 }}>
            <button type="submit">Add</button>
          </div>
        </div>
      </form>

      <table className="table" aria-label="department overview table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Students</th>
            <th>Faculty</th>
            <th>Courses</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dept_id}>
              <td>{r.dept_name}</td>
              <td>{r.students_count}</td>
              <td>{r.faculty_count}</td>
              <td>{r.courses_count}</td>
              <td>
                <button className="danger" type="button" onClick={() => removeDepartment(r.dept_id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan="5" style={{ color: "var(--muted)" }}>
                No data found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


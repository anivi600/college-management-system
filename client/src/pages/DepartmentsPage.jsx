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
    return () => { alive = false; };
  }, []);

  async function addDepartment(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/departments", { deptName });
      setDeptName("");
      setSuccess("Department added successfully.");
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
    <>
      <div className="page-header">
        <h2>Departments</h2>
        <p className="page-desc">Manage academic departments — the root anchor for faculty, students, and courses</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Add Department</div>
          <form onSubmit={addDepartment}>
            <div className="field">
              <label htmlFor="dept-name-input">Department Name</label>
              <input
                id="dept-name-input"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g., Physics"
                required
              />
            </div>
            <button type="submit">Add Department</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Overview</div>
          <div className="table-wrapper">
            <table className="table" aria-label="department overview table" id="departments-table">
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
                    <td><strong>{r.dept_name}</strong></td>
                    <td className="data-value">{r.students_count}</td>
                    <td className="data-value">{r.faculty_count}</td>
                    <td className="data-value">{r.courses_count}</td>
                    <td>
                      <button className="danger" type="button" onClick={() => removeDepartment(r.dept_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state"><p>No departments found.</p></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

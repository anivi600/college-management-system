import React, { useEffect, useState } from "react";
import api from "../api";

export default function StudentsPage() {
  const [deptOptions, setDeptOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", semester: "Sem 1", deptId: "" });

  async function load() {
    setError("");
    const [studentsRes, deptsRes] = await Promise.all([api.get("/students"), api.get("/departments")]);
    setRows(studentsRes.data || []);
    setDeptOptions(deptsRes.data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { name: form.name, email: form.email, semester: form.semester, deptId: form.deptId };
      if (editingStudentId) {
        await api.put(`/students/${editingStudentId}`, payload);
      } else {
        await api.post("/students", payload);
      }
      setEditingStudentId("");
      setForm({ name: "", email: "", semester: "Sem 1", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to save student");
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.delete(`/students/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to delete");
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Students</h2>
        <p className="page-desc">Manage student profiles — linked to departments via foreign key</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            {editingStudentId ? `Edit Student #${editingStudentId}` : "Add Student"}
          </div>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="student-name">Name</label>
              <input id="student-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div className="field">
              <label htmlFor="student-email">Email</label>
              <input id="student-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@college.edu" required />
            </div>
            <div className="field">
              <label htmlFor="student-semester">Semester</label>
              <input id="student-semester" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} placeholder="e.g., Sem 3" required />
            </div>
            <div className="field">
              <label htmlFor="student-dept">Department</label>
              <select id="student-dept" value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value }))} required>
                <option value="">Select department…</option>
                {deptOptions.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                ))}
              </select>
            </div>
            <div className="actions-row">
              <button type="submit">{editingStudentId ? "Update Student" : "Add Student"}</button>
              {editingStudentId && (
                <button type="button" className="secondary" onClick={() => { setEditingStudentId(""); setForm({ name: "", email: "", semester: "Sem 1", deptId: "" }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>All Students</div>
          <div className="table-wrapper">
            <table className="table" aria-label="students table" id="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Semester</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student_id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.email}</td>
                    <td><span className="badge badge-info">{r.semester}</span></td>
                    <td>{r.dept_name}</td>
                    <td>
                      <div className="actions-row">
                        <button className="secondary" onClick={() => { setEditingStudentId(r.student_id); setForm({ name: r.name || "", email: r.email || "", semester: r.semester || "", deptId: r.dept_id ? String(r.dept_id) : "" }); }} type="button">
                          Edit
                        </button>
                        <button className="danger" onClick={() => remove(r.student_id)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="5"><div className="empty-state"><p>No students found.</p></div></td>
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

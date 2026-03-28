import React, { useEffect, useState } from "react";
import api from "../api";

export default function FacultyPage() {
  const [deptOptions, setDeptOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingFacultyId, setEditingFacultyId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", deptId: "" });

  async function load() {
    setError("");
    const [facultyRes, deptsRes] = await Promise.all([api.get("/faculty"), api.get("/departments")]);
    setRows(facultyRes.data || []);
    setDeptOptions(deptsRes.data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { name: form.name, email: form.email, deptId: form.deptId };
      if (editingFacultyId) {
        await api.put(`/faculty/${editingFacultyId}`, payload);
      } else {
        await api.post("/faculty", payload);
      }
      setEditingFacultyId("");
      setForm({ name: "", email: "", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to save faculty");
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.delete(`/faculty/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to delete");
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Faculty</h2>
        <p className="page-desc">Manage faculty members — each assigned to a department via FK</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            {editingFacultyId ? `Edit Faculty #${editingFacultyId}` : "Add Faculty"}
          </div>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="faculty-name">Name</label>
              <input id="faculty-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div className="field">
              <label htmlFor="faculty-email">Email</label>
              <input id="faculty-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="faculty@college.edu" required />
            </div>
            <div className="field">
              <label htmlFor="faculty-dept">Department</label>
              <select id="faculty-dept" value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value }))} required>
                <option value="">Select department…</option>
                {deptOptions.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                ))}
              </select>
            </div>
            <div className="actions-row">
              <button type="submit">{editingFacultyId ? "Update Faculty" : "Add Faculty"}</button>
              {editingFacultyId && (
                <button type="button" className="secondary" onClick={() => { setEditingFacultyId(""); setForm({ name: "", email: "", deptId: "" }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>All Faculty</div>
          <div className="table-wrapper">
            <table className="table" aria-label="faculty table" id="faculty-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.faculty_id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.email}</td>
                    <td><span className="badge badge-info">{r.dept_name}</span></td>
                    <td>
                      <div className="actions-row">
                        <button className="secondary" onClick={() => { setEditingFacultyId(r.faculty_id); setForm({ name: r.name || "", email: r.email || "", deptId: r.dept_id ? String(r.dept_id) : "" }); }} type="button">Edit</button>
                        <button className="danger" onClick={() => remove(r.faculty_id)} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan="4"><div className="empty-state"><p>No faculty found.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

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
      const payload = {
        name: form.name,
        email: form.email,
        deptId: form.deptId,
      };

      if (editingFacultyId) {
        await api.put(`/faculty/${editingFacultyId}`, payload);
      } else {
        await api.post("/faculty", payload);
      }

      setEditingFacultyId("");
      setForm({ name: "", email: "", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to create faculty");
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
    <div className="card">
      <h2>Faculty</h2>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row">
        <div className="col">
          <form onSubmit={onSubmit}>
            {editingFacultyId ? (
              <div className="hint" style={{ marginBottom: 10 }}>
                Editing facultyId: <b>{editingFacultyId}</b>
              </div>
            ) : null}
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>Department</label>
              <select value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value }))}>
                <option value="">Select...</option>
                {deptOptions.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button type="submit">{editingFacultyId ? "Update faculty" : "Add faculty"}</button>
              {editingFacultyId ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingFacultyId("");
                    setForm({ name: "", email: "", deptId: "" });
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="col">
          <table className="table" aria-label="faculty table">
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
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.dept_name}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditingFacultyId(r.faculty_id);
                          setForm({
                            name: r.name || "",
                            email: r.email || "",
                            deptId: r.dept_id ? String(r.dept_id) : "",
                          });
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button className="danger" onClick={() => remove(r.faculty_id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan="4" style={{ color: "var(--muted)" }}>
                    No faculty found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


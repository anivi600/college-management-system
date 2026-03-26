import React, { useEffect, useState } from "react";
import api from "../api";

export default function StudentsPage() {
  const [deptOptions, setDeptOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    semester: "Sem 1",
    deptId: "",
  });

  async function load() {
    setError("");
    const [studentsRes, deptsRes] = await Promise.all([api.get("/students"), api.get("/departments")]);
    setRows(studentsRes.data || []);
    setDeptOptions(deptsRes.data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        semester: form.semester,
        deptId: form.deptId,
      };

      if (editingStudentId) {
        await api.put(`/students/${editingStudentId}`, payload);
      } else {
        await api.post("/students", payload);
      }

      setEditingStudentId("");
      setForm({ name: "", email: "", semester: "Sem 1", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to create student");
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
    <div className="card">
      <h2>Students</h2>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row">
        <div className="col">
          <form onSubmit={onSubmit}>
            {editingStudentId ? (
              <div className="hint" style={{ marginBottom: 10 }}>
                Editing studentId: <b>{editingStudentId}</b>
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
              <label>Semester</label>
              <input value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} />
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
              <button type="submit">{editingStudentId ? "Update student" : "Add student"}</button>
              {editingStudentId ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingStudentId("");
                    setForm({ name: "", email: "", semester: "Sem 1", deptId: "" });
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          <div className="hint" style={{ marginTop: 10 }}>
            Tip: enrollments and grades are created/updated via the database stored procedures + triggers.
          </div>
        </div>

        <div className="col">
          <table className="table" aria-label="students table">
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
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.semester}</td>
                  <td>{r.dept_name}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditingStudentId(r.student_id);
                          setForm({
                            name: r.name || "",
                            email: r.email || "",
                            semester: r.semester || "",
                            deptId: r.dept_id ? String(r.dept_id) : "",
                          });
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button className="danger" onClick={() => remove(r.student_id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan="5" style={{ color: "var(--muted)" }}>
                    No students found.
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


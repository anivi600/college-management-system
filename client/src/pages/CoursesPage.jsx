import React, { useEffect, useState } from "react";
import api from "../api";

export default function CoursesPage() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingCourseId, setEditingCourseId] = useState("");

  const [form, setForm] = useState({
    courseCode: "",
    title: "",
    credits: "3",
    facultyId: "",
    deptId: "",
  });

  async function load() {
    setError("");
    const [coursesRes, facultyRes, deptRes] = await Promise.all([
      api.get("/courses"),
      api.get("/faculty"),
      api.get("/departments"),
    ]);
    setRows(coursesRes.data || []);
    setFaculty(facultyRes.data || []);
    setDepartments(deptRes.data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.error || e.message || "Failed to load"));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        courseCode: form.courseCode,
        title: form.title,
        credits: Number(form.credits),
        facultyId: form.facultyId,
        deptId: form.deptId,
      };

      if (editingCourseId) {
        await api.put(`/courses/${editingCourseId}`, payload);
      } else {
        await api.post("/courses", payload);
      }

      setEditingCourseId("");
      setForm({ courseCode: "", title: "", credits: "3", facultyId: "", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to create course");
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.delete(`/courses/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to delete");
    }
  }

  return (
    <div className="card">
      <h2>Courses</h2>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row">
        <div className="col">
          <form onSubmit={onSubmit}>
            {editingCourseId ? (
              <div className="hint" style={{ marginBottom: 10 }}>
                Editing courseId: <b>{editingCourseId}</b>
              </div>
            ) : null}
            <div className="field">
              <label>Course Code</label>
              <input value={form.courseCode} onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))} />
            </div>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field">
              <label>Credits</label>
              <input value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} />
            </div>
            <div className="field">
              <label>Faculty</label>
              <select value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">Select...</option>
                {faculty.map((x) => (
                  <option key={x.faculty_id} value={x.faculty_id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value }))}>
                <option value="">Select...</option>
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button type="submit">{editingCourseId ? "Update course" : "Add course"}</button>
              {editingCourseId ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingCourseId("");
                    setForm({ courseCode: "", title: "", credits: "3", facultyId: "", deptId: "" });
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="col">
          <table className="table" aria-label="courses table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Credits</th>
                <th>Faculty</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.course_id}>
                  <td>
                    <b>{r.course_code}</b> - {r.title}
                  </td>
                  <td>{r.credits}</td>
                  <td>{r.faculty_name}</td>
                  <td>{r.dept_name}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditingCourseId(r.course_id);
                          setForm({
                            courseCode: r.course_code || "",
                            title: r.title || "",
                            credits: String(r.credits ?? ""),
                            facultyId: r.faculty_id ? String(r.faculty_id) : "",
                            deptId: r.dept_id ? String(r.dept_id) : "",
                          });
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button className="danger" onClick={() => remove(r.course_id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan="5" style={{ color: "var(--muted)" }}>
                    No courses found.
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


import React, { useEffect, useState } from "react";
import api from "../api";

export default function CoursesPage() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [form, setForm] = useState({ courseCode: "", title: "", credits: "3", facultyId: "", deptId: "" });

  async function load() {
    setError("");
    const [coursesRes, facultyRes, deptRes] = await Promise.all([
      api.get("/courses"), api.get("/faculty"), api.get("/departments"),
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
      const payload = { courseCode: form.courseCode, title: form.title, credits: Number(form.credits), facultyId: form.facultyId, deptId: form.deptId };
      if (editingCourseId) {
        await api.put(`/courses/${editingCourseId}`, payload);
      } else {
        await api.post("/courses", payload);
      }
      setEditingCourseId("");
      setForm({ courseCode: "", title: "", credits: "3", facultyId: "", deptId: "" });
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || "Failed to save course");
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
    <>
      <div className="page-header">
        <h2>Courses</h2>
        <p className="page-desc">Manage course offerings — each linked to a faculty member and department</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            {editingCourseId ? `Edit Course #${editingCourseId}` : "Add Course"}
          </div>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="course-code">Course Code</label>
              <input id="course-code" value={form.courseCode} onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))} placeholder="e.g., CS301" required />
            </div>
            <div className="field">
              <label htmlFor="course-title">Title</label>
              <input id="course-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., Data Structures" required />
            </div>
            <div className="field">
              <label htmlFor="course-credits">Credits</label>
              <input id="course-credits" type="number" min="1" value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="course-faculty">Faculty</label>
              <select id="course-faculty" value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))} required>
                <option value="">Select faculty…</option>
                {faculty.map((x) => (
                  <option key={x.faculty_id} value={x.faculty_id}>{x.name} ({x.dept_name})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="course-dept">Department</label>
              <select id="course-dept" value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value }))} required>
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                ))}
              </select>
            </div>
            <div className="actions-row">
              <button type="submit">{editingCourseId ? "Update Course" : "Add Course"}</button>
              {editingCourseId && (
                <button type="button" className="secondary" onClick={() => { setEditingCourseId(""); setForm({ courseCode: "", title: "", credits: "3", facultyId: "", deptId: "" }); }}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>All Courses</div>
          <div className="table-wrapper">
            <table className="table" aria-label="courses table" id="courses-table">
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
                    <td><strong>{r.course_code}</strong> — {r.title}</td>
                    <td><span className="badge badge-info">{r.credits}</span></td>
                    <td>{r.faculty_name}</td>
                    <td>{r.dept_name}</td>
                    <td>
                      <div className="actions-row">
                        <button className="secondary" onClick={() => { setEditingCourseId(r.course_id); setForm({ courseCode: r.course_code || "", title: r.title || "", credits: String(r.credits ?? ""), facultyId: r.faculty_id ? String(r.faculty_id) : "", deptId: r.dept_id ? String(r.dept_id) : "" }); }} type="button">Edit</button>
                        <button className="danger" onClick={() => remove(r.course_id)} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan="5"><div className="empty-state"><p>No courses found.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

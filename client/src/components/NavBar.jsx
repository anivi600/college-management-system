import React from "react";
import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <aside className="nav">
      <h1>College Manager</h1>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/departments">Departments</NavLink>
      <NavLink to="/students">Students</NavLink>
      <NavLink to="/faculty">Faculty</NavLink>
      <NavLink to="/courses">Courses</NavLink>
      <NavLink to="/enrollments">Enrollments</NavLink>
      <NavLink to="/grades">Grades</NavLink>
      <NavLink to="/attendance">Attendance</NavLink>
    </aside>
  );
}


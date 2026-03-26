import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";

import DashboardPage from "./pages/DashboardPage.jsx";
import DepartmentsPage from "./pages/DepartmentsPage.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import FacultyPage from "./pages/FacultyPage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";

const EnrollmentsPage = React.lazy(() => import("./pages/EnrollmentsPage.jsx"));
const GradesPage = React.lazy(() => import("./pages/GradesPage.jsx"));

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="page">
        <Suspense fallback={<div className="card">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/faculty" element={<FacultyPage />} />
            <Route path="/courses" element={<CoursesPage />} />

            <Route path="/enrollments" element={<EnrollmentsPage />} />
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}


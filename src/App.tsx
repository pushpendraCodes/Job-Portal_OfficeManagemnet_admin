import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthGate } from "./components/AuthGate";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployersPage from "./pages/EmployersPage";
import EmployerFormPage from "./pages/EmployerFormPage";
import EmployerDetailPage from "./pages/EmployerDetailPage";
import OfficeEmployeesPage from "./pages/OfficeEmployeesPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import SeekersPage from "./pages/SeekersPage";
import SeekerDetailPage from "./pages/SeekerDetailPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import LeadsPage from "./pages/LeadsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ExpenditurePage from "./pages/ExpenditurePage";
import CmsPage from "./pages/CmsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGate />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="employers" element={<EmployersPage />} />
            <Route path="employers/new" element={<EmployerFormPage />} />
            <Route path="employers/:userId" element={<EmployerDetailPage />} />
            <Route path="employers/:userId/edit" element={<EmployerFormPage />} />
            <Route path="employees" element={<OfficeEmployeesPage />} />
            <Route path="employees/:employeeId" element={<EmployeeDetailPage />} />
            <Route path="seekers" element={<SeekersPage />} />
            <Route path="seekers/:userId" element={<SeekerDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="expenditure" element={<ExpenditurePage />} />
            <Route path="cms" element={<CmsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDetail from "./pages/PatientDetail";
import DoctorExamination from "./pages/DoctorExamination";
import PatientDashboard from "./pages/PatientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import HisDashboard from "./pages/HisDashboard";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import PatientSidebar from "./components/PatientSidebar";
import PatientOverview from "./pages/PatientOverview";
import PatientHealthIndicators from "./pages/PatientHealthIndicators";
import PatientAppointments from "./pages/PatientAppointments";
import PatientMedicalRecords from "./pages/PatientMedicalRecords";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import PatientLabResults from "./pages/PatientLabResults";
import PatientImaging from "./pages/PatientImaging";

import PatientShareRecords from "./pages/PatientShareRecords";
import PatientNotifications from "./pages/PatientNotifications";
import PatientSettings from "./pages/PatientSettings";
import PatientMessages from "./pages/PatientMessages";
import PatientDoctorApplication from "./pages/PatientDoctorApplication";
import DoctorOverview from "./pages/DoctorOverview";
import DoctorStats from "./pages/DoctorStats";
import DoctorPatients from "./pages/DoctorPatients";
import DoctorPatientIntake from "./pages/DoctorPatientIntake";
import DoctorQueue from "./pages/DoctorQueue";
import DoctorExam from "./pages/DoctorExam";
import DoctorRecords from "./pages/DoctorRecords";
import DoctorPrescriptions from "./pages/DoctorPrescriptions";
import DoctorLabOrders from "./pages/DoctorLabOrders";
import DoctorImagingOrders from "./pages/DoctorImagingOrders";
import DoctorSchedule from "./pages/DoctorSchedule";
import DoctorShifts from "./pages/DoctorShifts";
import DoctorMessages from "./pages/DoctorMessages";
import DoctorNotifications from "./pages/DoctorNotifications";
import DoctorProfile from "./pages/DoctorProfile";
import DoctorSettings from "./pages/DoctorSettings";
import DoctorSidebar from "./components/DoctorSidebar";
import {
  Stethoscope,
  User,
  Shield,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" />;
  return children;
}

function Sidebar({ role }) {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const doctorLinks = [
    { to: "/doctor", label: "Tra cứu bệnh nhân", icon: Stethoscope },
    { to: "/doctor/history", label: "Lịch sử bệnh án", icon: Activity },
    { to: "/doctor/interactions", label: "Tương tác thuốc", icon: Shield },
  ];

  const patientLinks = [
    { to: "/patient", label: "Hồ sơ sức khỏe", icon: User },
    { to: "/patient/appointments", label: "Đặt lịch khám", icon: Activity },
    { to: "/patient/consents", label: "Quyền truy cập", icon: Shield },
  ];

  const adminLinks = [
    { to: "/admin", label: "Tổng quan", icon: Activity },
    { to: "/admin/hospitals", label: "Cơ sở y tế", icon: Stethoscope },
    { to: "/admin/master-data", label: "Danh mục dùng chung", icon: Shield },
  ];

  const links =
    role === "doctor"
      ? doctorLinks
      : role === "patient"
        ? patientLinks
        : adminLinks;

  return (
    <div className="w-64 bg-slate-800 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <Link to="/" className="text-xl font-bold text-blue-400">
          CentralizedEHR
        </Link>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

function MainLayout({ children, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <div className="hidden md:block">
        <Sidebar role={role} />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar role={role} />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="md:hidden p-4 bg-slate-800 text-white flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-blue-400">CentralizedEHR</span>
          <div className="w-6" />
        </div>
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

function PatientLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <PatientOverview />;
      case "health-indicators":
        return <PatientHealthIndicators />;
      case "appointments":
        return <PatientAppointments />;
      case "medical-records":
        return <PatientMedicalRecords />;
      case "prescriptions":
        return <PatientPrescriptions />;
      case "lab-results":
        return <PatientLabResults />;
      case "imaging":
        return <PatientImaging />;
      case "messages":
        return <PatientMessages />;
      case "share-records":
        return <PatientShareRecords />;
      case "notifications":
        return <PatientNotifications />;
      case "settings":
        return <PatientSettings />;
      case "doctor-application":
        return <PatientDoctorApplication onBack={() => setActiveTab("overview")} />;
      default:
        return <PatientOverview />;
    }
  };

  return (
    <div className="flex h-screen">
      <PatientSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function DoctorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, switchRole } = useAuth();

  const activeTab = location.pathname === "/doctor" ? "overview" : location.pathname.split("/").pop();

  const handleTabChange = (tab) => {
    navigate(`/doctor/${tab}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRoleSwitch = async (targetRole) => {
    try {
      await switchRole(targetRole);
      navigate(targetRole === "doctor" ? "/doctor" : "/patient");
    } catch (err) {
      alert(err.response?.data?.detail || "Chuyển vai trò thất bại");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <DoctorSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onRoleSwitch={handleRoleSwitch}
      />
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  const { role, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Protected routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorOverview />} />
        <Route path="overview" element={<DoctorOverview />} />
        <Route path="stats" element={<DoctorStats />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="intake" element={<DoctorPatientIntake />} />
        <Route path="queue" element={<DoctorQueue />} />
        <Route path="exam" element={<DoctorExam />} />
        <Route path="records" element={<DoctorRecords />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="lab-orders" element={<DoctorLabOrders />} />
        <Route path="imaging-orders" element={<DoctorImagingOrders />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="shifts" element={<DoctorShifts />} />
        <Route path="messages" element={<DoctorMessages />} />
        <Route path="notifications" element={<DoctorNotifications />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="settings" element={<DoctorSettings />} />
      </Route>
      <Route
        path="/doctor/examination/:id"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorExamination />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patient-detail/:id"
        element={
          <ProtectedRoute allowedRole="doctor">
            <PatientDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/his/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout role="admin">
              <Routes>
                <Route index element={<HisDashboard />} />
                <Route path="*" element={<HisDashboard />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={`/${role}`} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

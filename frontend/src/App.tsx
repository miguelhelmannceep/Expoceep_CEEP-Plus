import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { StudentLayout } from "./components/layout/StudentLayout";
import type { StudentTab } from "./components/layout/StudentLayout";
import { ManagementLayout } from "./components/layout/ManagementLayout";
import type { ManagementTab } from "./components/layout/ManagementLayout";
import { CanteenLayout } from "./components/layout/CanteenLayout";
import type { CanteenTab } from "./components/layout/CanteenLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Páginas do Aluno
import { DashboardPage as StudentDashboardPage } from "./pages/student/DashboardPage";
import { SchedulesPage } from "./pages/student/SchedulesPage";
import { CanteenPage } from "./pages/student/CanteenPage";
import { NoticesPage } from "./pages/student/NoticesPage";
import { TasksPage } from "./pages/student/TasksPage";
import { ProfilePage } from "./pages/student/ProfilePage";

// Páginas de Gestão e Cantina
import { ManagementDashboardPage } from "./pages/management/ManagementDashboardPage";
import { CanteenDashboardPage } from "./pages/canteen/CanteenDashboardPage";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, role } = useAuth();

  // Estados de navegação por perfil
  const [studentTab, setStudentTab] = useState<StudentTab>("inicio");
  const [managementTab, setManagementTab] = useState<ManagementTab>("dashboard");
  const [canteenTab, setCanteenTab] = useState<CanteenTab>("inicio");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner message="Inicializando CEEP+..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 1. Perfil ALUNO
  if (role === "ALUNO") {
    return (
      <ProtectedRoute allowedRoles={["ALUNO"]}>
        <StudentLayout activeTab={studentTab} onTabChange={setStudentTab}>
          {studentTab === "inicio" && <StudentDashboardPage onNavigate={setStudentTab} />}
          {studentTab === "horarios" && <SchedulesPage />}
          {studentTab === "cantina" && <CanteenPage />}
          {studentTab === "avisos" && <NoticesPage />}
          {studentTab === "tarefas" && <TasksPage />}
          {studentTab === "perfil" && <ProfilePage />}
        </StudentLayout>
      </ProtectedRoute>
    );
  }

  // 2. Perfil GESTÃO
  if (role === "GESTAO") {
    return (
      <ProtectedRoute allowedRoles={["GESTAO"]}>
        <ManagementLayout activeTab={managementTab} onTabChange={setManagementTab}>
          <ManagementDashboardPage activeTab={managementTab} />
        </ManagementLayout>
      </ProtectedRoute>
    );
  }

  // 3. Perfil CANTINA
  if (role === "CANTINA") {
    return (
      <ProtectedRoute allowedRoles={["CANTINA"]}>
        <CanteenLayout activeTab={canteenTab} onTabChange={setCanteenTab}>
          <CanteenDashboardPage activeTab={canteenTab} />
        </CanteenLayout>
      </ProtectedRoute>
    );
  }

  return <LoginPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

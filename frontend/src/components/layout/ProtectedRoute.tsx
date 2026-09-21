import React from "react";
import type { Role } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ShieldAlert } from "lucide-react";
import { Button } from "../common/Button";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <LoadingSpinner message="Validando credenciais..." />
      </div>
    );
  }

  if (!isAuthenticated || !user || !role) {
    return null;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-xs text-slate-500 mt-1">
              Seu perfil ({role}) não tem permissão para visualizar esta área.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="w-full">
            Trocar de Conta
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

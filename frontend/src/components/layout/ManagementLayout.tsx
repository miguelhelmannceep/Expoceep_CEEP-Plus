import React from "react";
import { LayoutDashboard, Bell, Users, Coffee, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export type ManagementTab = "dashboard" | "avisos" | "turmas" | "cantina" | "configuracoes";

interface ManagementLayoutProps {
  activeTab: ManagementTab;
  onTabChange: (tab: ManagementTab) => void;
  children: React.ReactNode;
}

export const ManagementLayout: React.FC<ManagementLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: ManagementTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "avisos", label: "Avisos", icon: Bell },
    { id: "turmas", label: "Turmas & Horários", icon: Users },
    { id: "cantina", label: "Cantina / Demanda", icon: Coffee },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base">CEEP+</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded">
                  Painel de Gestão
                </span>
              </div>
              <p className="text-xs text-slate-400">Coordenação & Direção Escolar</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-white">{user?.nome}</p>
              <p className="text-[11px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 text-xs font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto no-scrollbar flex space-x-1 border-t border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-blue-500 text-blue-400 bg-slate-800/60"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
};

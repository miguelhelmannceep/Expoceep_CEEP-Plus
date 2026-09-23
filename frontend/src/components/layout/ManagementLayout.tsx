import { LayoutDashboard, Bell, Users, BookOpen, Calendar, Coffee, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export type ManagementTab = "dashboard" | "avisos" | "turmas" | "disciplinas" | "horarios" | "cantina" | "configuracoes";

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
    { id: "turmas", label: "Cursos & Turmas", icon: Users },
    { id: "disciplinas", label: "Disciplinas & Docentes", icon: BookOpen },
    { id: "horarios", label: "Grade Horária", icon: Calendar },
    { id: "cantina", label: "Cantina / Demanda", icon: Coffee },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-[#2d3661] text-white border-b border-[#222a4d] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-200 shrink-0 overflow-hidden">
              <img
                src="/logo-ceep.png"
                alt="CEEP Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base">CEEP+</span>
                <span className="text-xs bg-[#4aaa3c]/20 text-[#7de06f] font-semibold px-2 py-0.5 rounded flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Painel de Gestão</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">Coordenação & Direção Escolar</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-white">{user?.nome}</p>
              <p className="text-[11px] text-slate-300">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#1f2647] text-slate-200 hover:text-red-400 hover:bg-[#181f3b] text-xs font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto no-scrollbar flex space-x-1 border-t border-[#3c4779]/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-[#4aaa3c] text-white bg-[#1f2647]"
                    : "border-transparent text-slate-300 hover:text-white hover:bg-[#1f2647]/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#7de06f]" : "text-slate-400"}`} />
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

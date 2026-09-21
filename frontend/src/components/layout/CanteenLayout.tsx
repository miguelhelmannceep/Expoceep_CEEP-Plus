import React from "react";
import { UtensilsCrossed, QrCode, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export type CanteenTab = "inicio" | "scanner" | "pedidos";

interface CanteenLayoutProps {
  activeTab: CanteenTab;
  onTabChange: (tab: CanteenTab) => void;
  children: React.ReactNode;
}

export const CanteenLayout: React.FC<CanteenLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: CanteenTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "inicio", label: "Painel", icon: UtensilsCrossed },
    { id: "scanner", label: "Scanner QR", icon: QrCode },
    { id: "pedidos", label: "Fila de Pedidos", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-xl mx-auto shadow-2xl border-x border-slate-800/80 antialiased">
      {/* Header Institucional do Terminal */}
      <header className="bg-slate-900/95 backdrop-blur-md p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#2d3661] border border-[#4aaa3c]/40 flex items-center justify-center font-bold text-white shadow-sm">
            <UtensilsCrossed className="w-5 h-5 text-[#4aaa3c]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">CEEP+</span>
              <span className="text-[10px] bg-[#4aaa3c]/15 text-[#4aaa3c] border border-[#4aaa3c]/30 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                Terminal da Cantina
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Atendente: <span className="text-slate-200">{user?.nome || "Operador"}</span>
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-red-400 hover:bg-slate-800 hover:border-red-900/50 transition-all active:scale-95"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Navegação por Abas */}
      <nav className="bg-slate-900/70 px-3 py-2 border-b border-slate-800 flex space-x-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#2d3661] text-white border border-[#4aaa3c]/50 shadow-md ring-1 ring-[#4aaa3c]/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#4aaa3c]" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 sm:p-5 overflow-y-auto">{children}</main>
    </div>
  );
};

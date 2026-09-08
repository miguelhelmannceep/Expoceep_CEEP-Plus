import React from "react";
import { Coffee, QrCode, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export type CanteenTab = "inicio" | "pedidos" | "scanner";

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
    { id: "inicio", label: "Início", icon: Coffee },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList },
    { id: "scanner", label: "Scanner QR", icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col max-w-lg mx-auto shadow-2xl border-x border-slate-800">
      {/* Header Operacional Cantina */}
      <header className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-slate-950 shadow-md">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base">CEEP+ Cantina</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded">
                Terminal Balcão
              </span>
            </div>
            <p className="text-xs text-slate-400">Atendente: {user?.nome}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition-all"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Navegação por Abas */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex space-x-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
};

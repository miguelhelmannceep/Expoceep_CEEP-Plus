import React from "react";
import { Home, Calendar, Coffee, Bell, CheckSquare, User as UserIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export type StudentTab = "inicio" | "horarios" | "cantina" | "avisos" | "tarefas" | "perfil";

interface StudentLayoutProps {
  activeTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { user } = useAuth();

  const navItems: { id: StudentTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "horarios", label: "Horários", icon: Calendar },
    { id: "cantina", label: "Cantina", icon: Coffee },
    { id: "avisos", label: "Avisos", icon: Bell },
    { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start antialiased">
      {/* Container responsivo mobile-first */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-2xl border-x border-slate-200/80">
        {/* Header Superior Mobile */}
        <header className="sticky top-0 z-30 bg-[#2d3661] text-white px-4 py-3 shadow-sm flex items-center justify-between border-b border-[#232b4e]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#2d3661] flex items-center justify-center font-black text-xs shadow-md border border-slate-200">
              C+
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white">CEEP+</span>
                <span className="text-[10px] bg-[#4aaa3c]/20 text-[#7de06f] font-semibold px-1.5 py-0.5 rounded">
                  Aluno
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px]">
                {user?.turma_nome || "CEEP Pedro Boaretto Neto"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onTabChange("perfil")}
              aria-label="Acessar meu perfil"
              title="Meu Perfil"
              className={`p-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === "perfil"
                  ? "bg-[#4aaa3c] text-white shadow-sm shadow-[#4aaa3c]/30"
                  : "bg-[#1f2647] text-slate-300 hover:text-white hover:bg-[#181f3b] active:scale-95"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">{user?.nome.split(" ")[0]}</span>
            </button>
          </div>
        </header>

        {/* Conteúdo Principal com scroll suave */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto space-y-4">{children}</main>

        {/* Barra de Navegação Inferior Fixa */}
        <nav
          role="navigation"
          aria-label="Navegação Principal do Aluno"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 max-w-md mx-auto safe-bottom shadow-lg"
        >
          <div className="flex items-center justify-around px-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-xl transition-all duration-150 ${
                    isActive
                      ? "text-[#2d3661] font-bold scale-[1.03]"
                      : "text-slate-400 hover:text-slate-600 active:scale-95"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5] text-[#2d3661]" : "stroke-2"}`} />
                  <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-[#4aaa3c] rounded-full mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

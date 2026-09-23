import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { studentService } from "../../services/student.service";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  User as UserIcon,
  Mail,
  BookOpen,
  School,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Sun,
  Moon,
  Check,
  Lock
} from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Estados de Edição de Nome
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(user?.nome || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleOpenEditName = () => {
    setEditedName(user?.nome || "");
    setNameError(null);
    setIsEditNameModalOpen(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editedName.trim();
    if (cleanName.length < 2) {
      setNameError("O nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (cleanName.length > 100) {
      setNameError("O nome deve ter no máximo 100 caracteres.");
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      await studentService.updateProfile({ nome: cleanName });
      await refreshUser();
      setIsEditNameModalOpen(false);
      setNameSuccess("Nome de exibição atualizado com sucesso.");
      setTimeout(() => setNameSuccess(null), 3500);
    } catch (err: any) {
      setNameError(err.message || "Não foi possível atualizar o nome.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <UserIcon className="w-5 h-5 text-[#2d3661] dark:text-[#7de06f]" />
          <span>Meu Perfil</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Dados cadastrais, preferências de visualização e informações do aluno.
        </p>
      </div>

      {/* Alerta de Sucesso na Alteração de Nome */}
      {nameSuccess && (
        <div className="p-3 bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 border border-[#4aaa3c]/30 rounded-xl text-xs text-[#2d3661] dark:text-[#7de06f] flex items-center space-x-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-[#4aaa3c] shrink-0" />
          <span className="font-semibold">{nameSuccess}</span>
        </div>
      )}

      {/* Card Principal com Avatar */}
      <Card className="p-6 text-center space-y-3 border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-[#2d3661] dark:bg-[#1a203a] text-[#7de06f] flex items-center justify-center font-black text-xl mx-auto shadow-md border border-[#232b4e] dark:border-slate-700 overflow-hidden">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nome || "Foto do Aluno"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Em caso de falha de rede ou bloqueio de imagem remota, oculta e exibe iniciais
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span>{user ? getInitials(user.nome) : "AL"}</span>
          )}
        </div>
        <div>
          <div className="flex items-center justify-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.nome || "Aluno"}</h3>
            <button
              onClick={handleOpenEditName}
              title="Alterar nome exibido"
              aria-label="Alterar nome exibido"
              className="p-1 text-slate-400 hover:text-[#2d3661] dark:hover:text-[#7de06f] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 text-[#2d3661] dark:text-[#7de06f] border border-[#4aaa3c]/30 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4aaa3c]" />
          <span>Perfil Ativo: {user?.perfil}</span>
        </div>
      </Card>

      {/* Card Modo de Aparência */}
      <Card className="p-4 space-y-3 border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Modo de Aparência
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Escolha o tema visual do aplicativo do aluno.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Opção Claro */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${
              theme === "light"
                ? "border-[#2d3661] bg-[#2d3661]/5 shadow-sm"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${theme === "light" ? "bg-[#2d3661] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                <Sun className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  Claro
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Padrão diurno
                </span>
              </div>
            </div>
            {theme === "light" && (
              <Check className="w-4 h-4 text-[#2d3661] shrink-0" />
            )}
          </button>

          {/* Opção Escuro */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${
              theme === "dark"
                ? "border-[#4aaa3c] bg-[#4aaa3c]/10 shadow-sm"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-[#4aaa3c] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                <Moon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  Escuro
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Alto contraste
                </span>
              </div>
            </div>
            {theme === "dark" && (
              <Check className="w-4 h-4 text-[#4aaa3c] shrink-0" />
            )}
          </button>
        </div>
      </Card>

      {/* Detalhes Acadêmicos */}
      <Card className="p-4 space-y-3 border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Vínculo Escolar
        </h4>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <School className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Instituição
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">CEEP Cascavel</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Turma
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{user?.turma_nome || "—"}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Curso
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{user?.curso_nome || "Desenvolvimento de Sistemas"}</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
              E-mail Institucional
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
              <span title="E-mail institucional gerenciado pelo sistema" className="text-slate-400">
                <Lock className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Botão Sair */}
      <Button
        variant="danger"
        size="md"
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full font-bold shadow-red-600/20"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>

      {/* Modal de Edição de Nome */}
      <Modal
        isOpen={isEditNameModalOpen}
        onClose={() => !isSavingName && setIsEditNameModalOpen(false)}
        title="Alterar Nome de Exibição"
      >
        <form onSubmit={handleSaveName} className="space-y-4">
          {nameError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{nameError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome Completo / Como quer ser chamado
            </label>
            <input
              id="student-name"
              type="text"
              required
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Ex: Seu Nome Completo"
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/15"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Atenção:</p>
            <p>Seu e-mail institucional (<strong>{user?.email}</strong>) permanece inalterado para validação de segurança escolar.</p>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsEditNameModalOpen(false)}
              disabled={isSavingName}
              className="w-1/3"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingName}
              disabled={isSavingName || !editedName.trim()}
              className="w-2/3 font-bold bg-[#2d3661] hover:bg-[#222a4d] text-white"
            >
              Salvar alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Logout */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Encerrar Sessão"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Deseja realmente sair da sua conta no <strong>CEEP+</strong>?
          </p>

          <div className="flex space-x-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={logout}
              className="flex-1 font-semibold"
            >
              Sim, Sair
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


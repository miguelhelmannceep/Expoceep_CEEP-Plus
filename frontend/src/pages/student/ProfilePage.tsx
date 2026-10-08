import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { studentService } from "../../services/student.service";
import { scheduleService } from "../../services/schedule.service";
import type { CourseOption, ClassOption } from "../../types";
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
  Lock,
  GraduationCap
} from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const isVisitor = user?.email === "aluno.publico@ceep.demo";

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Estados de Edição de Nome
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(user?.nome || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  // Estados de Seleção Acadêmica (Curso e Turma)
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<number | "">("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | "">("");
  const [isLoadingAcademic, setIsLoadingAcademic] = useState(true);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAcademic(true);
    Promise.all([
      scheduleService.getCourses(),
      scheduleService.getClasses()
    ])
      .then(([coursesData, classesData]) => {
        if (!isMounted) return;
        setCourses(coursesData);
        setClasses(classesData);

        if (user?.turma_id) {
          setSelectedTurmaId(user.turma_id);
          const currentClass = classesData.find((c) => c.id === user.turma_id);
          if (currentClass?.curso_id) {
            setSelectedCursoId(currentClass.curso_id);
          } else if (user?.curso_id) {
            setSelectedCursoId(user.curso_id);
          }
        } else if (user?.curso_id) {
          setSelectedCursoId(user.curso_id);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar opções acadêmicas:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAcademic(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.turma_id, user?.curso_id]);

  const availableClasses = useMemo(() => {
    if (!selectedCursoId) return [];
    return classes.filter((c) => c.curso_id === Number(selectedCursoId));
  }, [classes, selectedCursoId]);

  const handleCourseChange = (newCursoId: number | "") => {
    setSelectedCursoId(newCursoId);
    setSelectedTurmaId("");
    setAcademicError(null);
  };

  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCursoId || !selectedTurmaId) {
      setAcademicError("Selecione um curso e uma turma para salvar.");
      return;
    }

    setIsSavingAcademic(true);
    setAcademicError(null);

    try {
      await studentService.updateProfile({
        curso_id: Number(selectedCursoId),
        turma_id: Number(selectedTurmaId)
      });
      await refreshUser();
      setAcademicSuccess("Curso e turma atualizados com sucesso!");
      setTimeout(() => setAcademicSuccess(null), 3500);
    } catch (err: any) {
      setAcademicError(err.message || "Erro ao atualizar informações acadêmicas.");
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleOpenEditName = () => {
    if (isVisitor) return;
    setEditedName(user?.nome || "");
    setNameError(null);
    setIsEditNameModalOpen(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVisitor) {
      setNameError("O nome do Aluno Visitante EXPOCEEP não pode ser alterado.");
      return;
    }
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
            {!isVisitor && (
              <button
                onClick={handleOpenEditName}
                title="Alterar nome exibido"
                aria-label="Alterar nome exibido"
                className="p-1 text-slate-400 hover:text-[#2d3661] dark:hover:text-[#7de06f] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
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
      <Card className="p-4 space-y-4 border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <GraduationCap className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
            <span>Vínculo Escolar</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Identificação institucional e enturmação do estudante.
          </p>
        </div>

        {/* Resumo Atual */}
        <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center shrink-0 mr-2">
              <School className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
              Instituição
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right leading-snug">
              Centro Estadual de Educação Profissional Pedro Boaretto Neto
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Curso Atual
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
              {user?.curso_nome || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Turma Atual
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
              {user?.turma_nome || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
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

        {/* Formulário de Seleção de Curso e Turma */}
        <form onSubmit={handleSaveAcademic} className="space-y-3 pt-1">
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Configurar Curso e Turma
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Selecione seu curso técnico para filtrar as turmas disponíveis e vincular sua grade horária.
            </p>
          </div>

          {academicSuccess && (
            <div className="p-3 bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 border border-[#4aaa3c]/30 rounded-xl text-xs text-[#2d3661] dark:text-[#7de06f] flex items-center space-x-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-[#4aaa3c] shrink-0" />
              <span className="font-semibold">{academicSuccess}</span>
            </div>
          )}

          {academicError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{academicError}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Seletor de Curso */}
            <div className="space-y-1.5">
              <label
                htmlFor="select-curso-perfil"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                1. Selecionar Curso Técnico
              </label>
              <select
                id="select-curso-perfil"
                disabled={isLoadingAcademic || isSavingAcademic}
                value={selectedCursoId}
                onChange={(e) => handleCourseChange(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/15 disabled:bg-slate-100/60 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed"
              >
                <option value="">Selecione seu curso técnico...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.sigla})
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Turma (Dependente do Curso) */}
            <div className="space-y-1.5">
              <label
                htmlFor="select-turma-perfil"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                2. Selecionar Turma
              </label>
              <select
                id="select-turma-perfil"
                disabled={!selectedCursoId || isLoadingAcademic || isSavingAcademic}
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/15 disabled:bg-slate-100/60 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCursoId
                    ? "Selecione primeiro o curso técnico"
                    : availableClasses.length === 0
                    ? "Nenhuma turma cadastrada para este curso"
                    : "Selecione sua turma..."}
                </option>
                {availableClasses.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome_turma} — Turno {t.periodo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSavingAcademic}
            disabled={
              isSavingAcademic ||
              !selectedCursoId ||
              !selectedTurmaId ||
              selectedTurmaId === user?.turma_id
            }
            className="w-full font-bold bg-[#2d3661] hover:bg-[#222a4d] text-white mt-1 shadow-sm"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Salvar Vínculo Acadêmico
          </Button>
        </form>
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


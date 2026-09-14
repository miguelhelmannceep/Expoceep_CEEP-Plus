import React, { useState, useEffect } from "react";
import {
  BookOpen,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Mail,
  GraduationCap,
  Power,
} from "lucide-react";
import { disciplineProfessorService } from "../../services/discipline_professor.service";
import { courseClassService } from "../../services/course_class.service";
import type {
  DisciplineItem,
  CreateDisciplinePayload,
  UpdateDisciplinePayload,
  ProfessorItem,
  CreateProfessorPayload,
  UpdateProfessorPayload,
  CourseItem,
} from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

export const ManagementDisciplinesProfessorsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<"disciplinas" | "professores">("disciplinas");

  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("TODOS");

  // Modais - Disciplinas
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<DisciplineItem | null>(null);
  const [disciplineFormData, setDisciplineFormData] = useState<{
    nome: string;
    sigla: string;
    curso_id: number;
    ativo: boolean;
  }>({
    nome: "",
    sigla: "",
    curso_id: 0,
    ativo: true,
  });

  // Modais - Professores
  const [isProfessorModalOpen, setIsProfessorModalOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<ProfessorItem | null>(null);
  const [professorFormData, setProfessorFormData] = useState<{
    nome: string;
    email: string;
    ativo: boolean;
  }>({
    nome: "",
    email: "",
    ativo: true,
  });

  // Modal de Exclusão
  const [deletingTarget, setDeletingTarget] = useState<{
    type: "disciplina" | "professor";
    id: number;
    title: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [discData, profData, coursesData] = await Promise.all([
        disciplineProfessorService.getDisciplines(),
        disciplineProfessorService.getProfessors(),
        courseClassService.getCourses(),
      ]);
      setDisciplines(discData);
      setProfessors(profData);
      setCourses(coursesData);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar disciplinas e professores.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // --- Handlers de Disciplinas ---
  const handleOpenNewDisciplineModal = () => {
    setEditingDiscipline(null);
    const defaultCourseId = courses.length > 0 ? courses[0].id : 0;
    setDisciplineFormData({
      nome: "",
      sigla: "",
      curso_id: defaultCourseId,
      ativo: true,
    });
    setIsDisciplineModalOpen(true);
  };

  const handleOpenEditDisciplineModal = (d: DisciplineItem) => {
    setEditingDiscipline(d);
    setDisciplineFormData({
      nome: d.nome,
      sigla: d.sigla || "",
      curso_id: d.curso_id,
      ativo: d.ativo,
    });
    setIsDisciplineModalOpen(true);
  };

  const handleSaveDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplineFormData.nome.trim()) {
      showFeedback("error", "Informe o nome da disciplina.");
      return;
    }
    if (!disciplineFormData.curso_id) {
      showFeedback("error", "Selecione o curso vinculado à disciplina.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDiscipline) {
        const payload: UpdateDisciplinePayload = {
          nome: disciplineFormData.nome.trim(),
          sigla: disciplineFormData.sigla.trim() ? disciplineFormData.sigla.trim().toUpperCase() : null,
          curso_id: disciplineFormData.curso_id,
          ativo: disciplineFormData.ativo,
        };
        await disciplineProfessorService.updateDiscipline(editingDiscipline.id, payload);
        showFeedback("success", `Disciplina '${payload.nome}' atualizada com sucesso.`);
      } else {
        const payload: CreateDisciplinePayload = {
          nome: disciplineFormData.nome.trim(),
          sigla: disciplineFormData.sigla.trim() ? disciplineFormData.sigla.trim().toUpperCase() : null,
          curso_id: disciplineFormData.curso_id,
          ativo: disciplineFormData.ativo,
        };
        await disciplineProfessorService.createDiscipline(payload);
        showFeedback("success", `Disciplina '${payload.nome}' criada com sucesso.`);
      }
      setIsDisciplineModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar disciplina.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDisciplineActive = async (d: DisciplineItem) => {
    try {
      const res = await disciplineProfessorService.toggleDisciplineActive(d.id);
      showFeedback(
        "success",
        `Disciplina '${d.nome}' ${res.ativo ? "ativada" : "desativada"} com sucesso.`
      );
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao alterar status da disciplina.");
    }
  };

  // --- Handlers de Professores ---
  const handleOpenNewProfessorModal = () => {
    setEditingProfessor(null);
    setProfessorFormData({
      nome: "",
      email: "",
      ativo: true,
    });
    setIsProfessorModalOpen(true);
  };

  const handleOpenEditProfessorModal = (p: ProfessorItem) => {
    setEditingProfessor(p);
    setProfessorFormData({
      nome: p.nome,
      email: p.email || "",
      ativo: p.ativo,
    });
    setIsProfessorModalOpen(true);
  };

  const handleSaveProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professorFormData.nome.trim()) {
      showFeedback("error", "Informe o nome do professor.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProfessor) {
        const payload: UpdateProfessorPayload = {
          nome: professorFormData.nome.trim(),
          email: professorFormData.email.trim() ? professorFormData.email.trim().toLowerCase() : null,
          ativo: professorFormData.ativo,
        };
        await disciplineProfessorService.updateProfessor(editingProfessor.id, payload);
        showFeedback("success", `Professor '${payload.nome}' atualizado com sucesso.`);
      } else {
        const payload: CreateProfessorPayload = {
          nome: professorFormData.nome.trim(),
          email: professorFormData.email.trim() ? professorFormData.email.trim().toLowerCase() : null,
          ativo: professorFormData.ativo,
        };
        await disciplineProfessorService.createProfessor(payload);
        showFeedback("success", `Professor '${payload.nome}' cadastrado com sucesso.`);
      }
      setIsProfessorModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar professor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProfessorActive = async (p: ProfessorItem) => {
    try {
      const res = await disciplineProfessorService.toggleProfessorActive(p.id);
      showFeedback(
        "success",
        `Professor '${p.nome}' ${res.ativo ? "ativado" : "desativado"} com sucesso.`
      );
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao alterar status do professor.");
    }
  };

  // --- Handler de Exclusão ---
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setIsSubmitting(true);
    try {
      if (deletingTarget.type === "disciplina") {
        const res = await disciplineProfessorService.deleteDiscipline(deletingTarget.id);
        showFeedback("success", res.mensagem || "Disciplina excluída com sucesso.");
      } else {
        const res = await disciplineProfessorService.deleteProfessor(deletingTarget.id);
        showFeedback("success", res.mensagem || "Professor excluído com sucesso.");
      }
      setDeletingTarget(null);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao excluir registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando disciplinas e professores..." />;
  }

  if (error && disciplines.length === 0 && professors.length === 0) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  // Filtragens
  const filteredDisciplines = disciplines.filter((d) => {
    const matchesSearch =
      d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.sigla && d.sigla.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.curso_nome && d.curso_nome.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse =
      selectedCourseFilter === "TODOS" || String(d.curso_id) === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  const filteredProfessors = professors.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Corpo Docente & Matriz
            </span>
            <span className="text-xs text-slate-400 font-medium">| CEEP Pedro Boaretto Neto</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Disciplinas e Professores</h2>
          <p className="text-xs text-slate-500">
            Gerencie as componentes curriculares por curso e o corpo docente da instituição.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {subTab === "disciplinas" ? (
            <button
              onClick={handleOpenNewDisciplineModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Disciplina</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewProfessorModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Professor</span>
            </button>
          )}

          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navegação entre Sub-abas */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setSubTab("disciplinas");
            setSearchQuery("");
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === "disciplinas"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Disciplinas ({disciplines.length})</span>
        </button>

        <button
          onClick={() => {
            setSubTab("professores");
            setSearchQuery("");
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === "professores"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Professores ({professors.length})</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              subTab === "disciplinas"
                ? "Buscar disciplina por nome, sigla ou curso..."
                : "Buscar professor por nome ou email..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {subTab === "disciplinas" && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="TODOS">Todos os Cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sigla} — {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SUB-ABA 1: DISCIPLINAS */}
      {subTab === "disciplinas" && (
        <div>
          {filteredDisciplines.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhuma disciplina encontrada</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Nenhuma disciplina cadastrada para o filtro aplicado.
              </p>
              <button
                onClick={handleOpenNewDisciplineModal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeira Disciplina</span>
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDisciplines.map((d) => (
                <Card
                  key={d.id}
                  className="p-5 bg-white border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg">
                          {d.curso_sigla || "CURSO"}
                        </span>
                        {d.sigla && (
                          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {d.sigla}
                          </span>
                        )}
                      </div>
                      <Badge variant={d.ativo ? "success" : "neutral"}>
                        {d.ativo ? "ATIVA" : "INATIVA"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">{d.nome}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{d.curso_nome || "Curso Técnico"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleDisciplineActive(d)}
                      title={d.ativo ? "Desativar disciplina" : "Ativar disciplina"}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        d.ativo
                          ? "text-slate-500 hover:bg-slate-100"
                          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{d.ativo ? "Desativar" : "Ativar"}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditDisciplineModal(d)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() =>
                          setDeletingTarget({
                            type: "disciplina",
                            id: d.id,
                            title: d.nome,
                          })
                        }
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: PROFESSORES */}
      {subTab === "professores" && (
        <div>
          {filteredProfessors.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
              <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum professor encontrado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Nenhum professor cadastrado corresponde à busca.
              </p>
              <button
                onClick={handleOpenNewProfessorModal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeiro Professor</span>
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfessors.map((p) => (
                <Card
                  key={p.id}
                  className="p-5 bg-white border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200/80">
                        {p.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <Badge variant={p.ativo ? "success" : "neutral"}>
                        {p.ativo ? "ATIVO" : "INATIVO"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">{p.nome}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.email || "Sem e-mail cadastrado"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleProfessorActive(p)}
                      title={p.ativo ? "Desativar docente" : "Ativar docente"}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        p.ativo
                          ? "text-slate-500 hover:bg-slate-100"
                          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{p.ativo ? "Desativar" : "Ativar"}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditProfessorModal(p)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() =>
                          setDeletingTarget({
                            type: "professor",
                            id: p.id,
                            title: p.nome,
                          })
                        }
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR DISCIPLINA */}
      {isDisciplineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingDiscipline ? "Editar Disciplina" : "Nova Disciplina"}
                </h3>
              </div>
              <button
                onClick={() => setIsDisciplineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscipline} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Curso Vinculado *</label>
                <select
                  value={disciplineFormData.curso_id}
                  onChange={(e) =>
                    setDisciplineFormData({
                      ...disciplineFormData,
                      curso_id: Number(e.target.value),
                    })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value={0} disabled>
                    Selecione o curso...
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.sigla} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nome da Disciplina *</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web, Topografia, Circuitos Elétricos"
                  value={disciplineFormData.nome}
                  onChange={(e) =>
                    setDisciplineFormData({ ...disciplineFormData, nome: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sigla (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: DW, BD, PAM, TOPO"
                  value={disciplineFormData.sigla}
                  onChange={(e) =>
                    setDisciplineFormData({
                      ...disciplineFormData,
                      sigla: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="disciplineAtivo"
                  checked={disciplineFormData.ativo}
                  onChange={(e) =>
                    setDisciplineFormData({
                      ...disciplineFormData,
                      ativo: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="disciplineAtivo"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Disciplina Ativa na Grade Curricular
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDisciplineModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDiscipline ? "Salvar Alterações" : "Criar Disciplina"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PROFESSOR */}
      {isProfessorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingProfessor ? "Editar Professor" : "Cadastrar Professor"}
                </h3>
              </div>
              <button
                onClick={() => setIsProfessorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfessor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nome do Docente *</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Carlos, Profª. Juliana"
                  value={professorFormData.nome}
                  onChange={(e) =>
                    setProfessorFormData({ ...professorFormData, nome: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">E-mail Institucional (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ex: docente@ceep.demo"
                  value={professorFormData.email}
                  onChange={(e) =>
                    setProfessorFormData({ ...professorFormData, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="professorAtivo"
                  checked={professorFormData.ativo}
                  onChange={(e) =>
                    setProfessorFormData({
                      ...professorFormData,
                      ativo: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label
                  htmlFor="professorAtivo"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Professor Ativo na Instituição
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProfessorModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProfessor ? "Salvar Alterações" : "Cadastrar Professor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Confirmar Exclusão de {deletingTarget.type === "disciplina" ? "Disciplina" : "Professor"}
                </h3>
                <p className="text-xs text-slate-500">Esta ação verificará a grade horária.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir{" "}
              <strong className="text-slate-900">{deletingTarget.title}</strong>? Caso existam
              aulas vinculadas na grade horária, o sistema não permitirá a exclusão silenciosa.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

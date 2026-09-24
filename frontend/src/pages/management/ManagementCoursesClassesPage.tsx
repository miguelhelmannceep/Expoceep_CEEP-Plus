import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Building2,
  RefreshCw,
  Search,
} from "lucide-react";
import { courseClassService } from "../../services/course_class.service";
import type {
  CourseItem,
  ClassItem,
  CreateCoursePayload,
  UpdateCoursePayload,
  CreateClassPayload,
  UpdateClassPayload,
} from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

export const ManagementCoursesClassesPage: React.FC = () => {
  const [subTab, setSubTab] = useState<"cursos" | "turmas">("cursos");

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros de busca
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("TODOS");

  // Estados de Modal - Cursos
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [courseFormData, setCourseFormData] = useState<{ nome: string; sigla: string; ativo: boolean }>({
    nome: "",
    sigla: "",
    ativo: true,
  });

  // Estados de Modal - Turmas
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classFormData, setClassFormData] = useState<{
    nome_turma: string;
    curso_id: number;
    ano: string;
    periodo: string;
    ativo: boolean;
  }>({
    nome_turma: "",
    curso_id: 0,
    ano: "3º Ano",
    periodo: "Manhã",
    ativo: true,
  });

  // Estados de Modal de Confirmação de Exclusão
  const [deletingTarget, setDeletingTarget] = useState<{
    type: "curso" | "turma";
    id: number;
    title: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesData, classesData] = await Promise.all([
        courseClassService.getCourses(),
        courseClassService.getClasses(),
      ]);
      setCourses(coursesData);
      setClasses(classesData);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar cursos e turmas.");
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

  // --- Handlers para Cursos ---
  const handleOpenNewCourseModal = () => {
    setEditingCourse(null);
    setCourseFormData({ nome: "", sigla: "", ativo: true });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourseModal = (course: CourseItem) => {
    setEditingCourse(course);
    setCourseFormData({
      nome: course.nome,
      sigla: course.sigla,
      ativo: course.ativo,
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.nome.trim() || !courseFormData.sigla.trim()) {
      showFeedback("error", "Preencha o nome e a sigla do curso.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCourse) {
        const payload: UpdateCoursePayload = {
          nome: courseFormData.nome.trim(),
          sigla: courseFormData.sigla.trim().toUpperCase(),
          ativo: courseFormData.ativo,
        };
        await courseClassService.updateCourse(editingCourse.id, payload);
        showFeedback("success", `Curso '${payload.nome}' atualizado com sucesso.`);
      } else {
        const payload: CreateCoursePayload = {
          nome: courseFormData.nome.trim(),
          sigla: courseFormData.sigla.trim().toUpperCase(),
          ativo: courseFormData.ativo,
        };
        await courseClassService.createCourse(payload);
        showFeedback("success", `Curso '${payload.nome}' criado com sucesso.`);
      }
      setIsCourseModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar curso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers para Turmas ---
  const handleOpenNewClassModal = () => {
    setEditingClass(null);
    const defaultCourseId = courses.length > 0 ? courses[0].id : 0;
    setClassFormData({
      nome_turma: "",
      curso_id: defaultCourseId,
      ano: "3º Ano",
      periodo: "Manhã",
      ativo: true,
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (turma: ClassItem) => {
    setEditingClass(turma);
    setClassFormData({
      nome_turma: turma.nome_turma,
      curso_id: turma.curso_id || (courses.length > 0 ? courses[0].id : 0),
      ano: turma.ano || "3º Ano",
      periodo: turma.periodo || "Manhã",
      ativo: turma.ativo,
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.nome_turma.trim()) {
      showFeedback("error", "Informe o nome da turma.");
      return;
    }
    if (!classFormData.curso_id) {
      showFeedback("error", "Selecione o curso correspondente.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClass) {
        const payload: UpdateClassPayload = {
          nome_turma: classFormData.nome_turma.trim(),
          curso_id: classFormData.curso_id,
          ano: classFormData.ano.trim(),
          periodo: classFormData.periodo.trim(),
          ativo: classFormData.ativo,
        };
        await courseClassService.updateClass(editingClass.id, payload);
        showFeedback("success", `Turma '${payload.nome_turma}' atualizada com sucesso.`);
      } else {
        const payload: CreateClassPayload = {
          nome_turma: classFormData.nome_turma.trim(),
          curso_id: classFormData.curso_id,
          ano: classFormData.ano.trim(),
          periodo: classFormData.periodo.trim(),
          ativo: classFormData.ativo,
        };
        await courseClassService.createClass(payload);
        showFeedback("success", `Turma '${payload.nome_turma}' criada com sucesso.`);
      }
      setIsClassModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar turma.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers de Exclusão ---
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setIsSubmitting(true);
    try {
      if (deletingTarget.type === "curso") {
        const res = await courseClassService.deleteCourse(deletingTarget.id);
        showFeedback("success", res.mensagem || "Curso excluído com sucesso.");
      } else {
        const res = await courseClassService.deleteClass(deletingTarget.id);
        showFeedback("success", res.mensagem || "Turma excluída com sucesso.");
      }
      setDeletingTarget(null);
      loadData();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao excluir item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando cursos e turmas..." />;
  }

  if (error && courses.length === 0 && classes.length === 0) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  // Filtragem de Cursos
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sigla.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filtragem de Turmas
  const filteredClasses = classes.filter((t) => {
    const matchesSearch =
      t.nome_turma.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.curso.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse =
      selectedCourseFilter === "TODOS" || String(t.curso_id) === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 border border-[#2d3661]/20 dark:border-[#7de06f]/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Estrutura Acadêmica
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">| CEEP Pedro Boaretto Neto</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">Gestão de Cursos e Turmas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre, edite e organize os cursos técnicos integrados e suas respectivas turmas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {subTab === "cursos" ? (
            <button
              onClick={handleOpenNewCourseModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Curso</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewClassModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Turma</span>
            </button>
          )}

          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
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
              ? "bg-[#4aaa3c]/10 text-[#2d3661] dark:text-[#7de06f] border-[#4aaa3c]/30"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#4aaa3c] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navegação entre Sub-abas (Cursos / Turmas) */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => {
            setSubTab("cursos");
            setSearchQuery("");
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === "cursos"
              ? "bg-[#2d3661] text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Cursos Técnicos ({courses.length})</span>
        </button>

        <button
          onClick={() => {
            setSubTab("turmas");
            setSearchQuery("");
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === "turmas"
              ? "bg-[#2d3661] text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Turmas ({classes.length})</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              subTab === "cursos"
                ? "Buscar curso por nome ou sigla..."
                : "Buscar turma por nome ou curso..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
          />
        </div>

        {subTab === "turmas" && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
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

      {/* SUB-ABA 1: CURSOS */}
      {subTab === "cursos" && (
        <div>
          {filteredCourses.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <GraduationCap className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum curso encontrado</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Nenhum curso técnico corresponde aos critérios de pesquisa ou não há cursos cadastrados.
              </p>
              <button
                onClick={handleOpenNewCourseModal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeiro Curso</span>
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((c) => (
                <Card
                  key={c.id}
                  className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 border border-[#2d3661]/20 dark:border-[#7de06f]/20 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {c.sigla}
                      </span>
                      <Badge variant={c.ativo ? "success" : "neutral"}>
                        {c.ativo ? "ATIVO" : "INATIVO"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{c.nome}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {c.total_turmas !== undefined ? c.total_turmas : 0} turma(s) vinculada(s)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenEditCourseModal(c)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() =>
                        setDeletingTarget({
                          type: "curso",
                          id: c.id,
                          title: c.nome,
                        })
                      }
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: TURMAS */}
      {subTab === "turmas" && (
        <div>
          {filteredClasses.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhuma turma encontrada</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não foram encontradas turmas para o filtro selecionado ou não há turmas cadastradas.
              </p>
              <button
                onClick={handleOpenNewClassModal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Nova Turma</span>
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((t) => (
                <Card
                  key={t.id}
                  className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 border border-[#2d3661]/20 dark:border-[#7de06f]/20 px-2 py-0.5 rounded-md">
                          {t.curso_sigla || "CURSO"}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {t.periodo || "Manhã"}
                        </span>
                      </div>
                      <Badge variant={t.ativo ? "success" : "neutral"}>
                        {t.ativo ? "ATIVA" : "INATIVA"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{t.nome_turma}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{t.curso}</span>
                      </p>
                      {t.ano && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                          Série / Ano: {t.ano}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenEditClassModal(t)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() =>
                        setDeletingTarget({
                          type: "turma",
                          id: t.id,
                          title: t.nome_turma,
                        })
                      }
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CURSO */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <GraduationCap className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingCourse ? "Editar Curso Técnico" : "Novo Curso Técnico"}
                </h3>
              </div>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome Completo do Curso *</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento de Sistemas"
                  value={courseFormData.nome}
                  onChange={(e) => setCourseFormData({ ...courseFormData, nome: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sigla Institucional *</label>
                <input
                  type="text"
                  placeholder="Ex: DS, EDIF, ELETRO, ADM"
                  value={courseFormData.sigla}
                  onChange={(e) =>
                    setCourseFormData({ ...courseFormData, sigla: e.target.value.toUpperCase() })
                  }
                  required
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="courseAtivo"
                  checked={courseFormData.ativo}
                  onChange={(e) =>
                    setCourseFormData({ ...courseFormData, ativo: e.target.checked })
                  }
                  className="w-4 h-4 text-[#2d3661] rounded border-slate-300 dark:border-slate-700 focus:ring-[#2d3661]"
                />
                <label htmlFor="courseAtivo" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Curso Ativo na Instituição
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCourse ? "Salvar Alterações" : "Criar Curso"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR TURMA */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingClass ? "Editar Turma" : "Nova Turma"}
                </h3>
              </div>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Curso Vinculado *</label>
                <select
                  value={classFormData.curso_id}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, curso_id: Number(e.target.value) })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                >
                  <option value={0} disabled>
                    Selecione um curso...
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.sigla} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome / Identificador da Turma *</label>
                <input
                  type="text"
                  placeholder="Ex: 3º C — Desenvolvimento de Sistemas"
                  value={classFormData.nome_turma}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, nome_turma: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Série / Ano</label>
                  <select
                    value={classFormData.ano}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, ano: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                  >
                    <option value="1º Ano">1º Ano</option>
                    <option value="2º Ano">2º Ano</option>
                    <option value="3º Ano">3º Ano</option>
                    <option value="4º Ano">4º Ano</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Turno / Período</label>
                  <select
                    value={classFormData.periodo}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, periodo: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="classAtivo"
                  checked={classFormData.ativo}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, ativo: e.target.checked })
                  }
                  className="w-4 h-4 text-[#2d3661] rounded border-slate-300 dark:border-slate-700 focus:ring-[#2d3661]"
                />
                <label htmlFor="classAtivo" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Turma Ativa para Matrícula e Horários
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClass ? "Salvar Alterações" : "Criar Turma"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200 transition-colors">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Confirmar Exclusão de {deletingTarget.type === "curso" ? "Curso" : "Turma"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Esta ação verificará a integridade de dados.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tem certeza de que deseja excluir{" "}
              <strong className="text-slate-900 dark:text-slate-100">{deletingTarget.title}</strong>? Caso existam
              alunos, turmas ou horários vinculados, o sistema não permitirá a exclusão silenciosa.
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
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

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User as UserIcon,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { managementScheduleService } from "../../services/management_schedule.service";
import { courseClassService } from "../../services/course_class.service";
import { disciplineProfessorService } from "../../services/discipline_professor.service";
import type {
  ClassItem,
  DisciplineItem,
  ProfessorItem,
  ManagementScheduleItem,
  CreateSchedulePayload,
  UpdateSchedulePayload,
} from "../../types";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

export const ManagementSchedulesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [schedules, setSchedules] = useState<ManagementScheduleItem[]>([]);

  const [selectedDay, setSelectedDay] = useState<string>("Segunda-feira");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ManagementScheduleItem | null>(null);
  const [formData, setFormData] = useState<{
    turma_id: number;
    disciplina_id: number;
    professor_id: number;
    dia_semana: string;
    horario_inicio: string;
    horario_fim: string;
  }>({
    turma_id: 0,
    disciplina_id: 0,
    professor_id: 0,
    dia_semana: "Segunda-feira",
    horario_inicio: "07:30",
    horario_fim: "08:20",
  });

  // Modal de Exclusão
  const [deletingId, setDeletingId] = useState<{ id: number; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = [
    { full: "Segunda-feira", short: "Seg" },
    { full: "Terça-feira", short: "Ter" },
    { full: "Quarta-feira", short: "Qua" },
    { full: "Quinta-feira", short: "Qui" },
    { full: "Sexta-feira", short: "Sex" },
  ];

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, discData, profData] = await Promise.all([
        courseClassService.getClasses(),
        disciplineProfessorService.getDisciplines(),
        disciplineProfessorService.getProfessors(),
      ]);

      setClasses(classesData);
      setDisciplines(discData);
      setProfessors(profData);

      if (classesData.length > 0) {
        setSelectedClassId((prev) => (prev ? prev : classesData[0].id));
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da grade horária.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedClassId) return;
    try {
      const schedData = await managementScheduleService.getSchedules(selectedClassId);
      setSchedules(schedData);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao carregar aulas da turma.");
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadSchedules();
    }
  }, [selectedClassId]);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  const handleOpenNewModal = () => {
    setEditingSchedule(null);
    const defaultTurmaId = selectedClassId || (classes.length > 0 ? classes[0].id : 0);
    const defaultDiscId = disciplines.length > 0 ? disciplines[0].id : 0;
    const defaultProfId = professors.length > 0 ? professors[0].id : 0;

    setFormData({
      turma_id: defaultTurmaId,
      disciplina_id: defaultDiscId,
      professor_id: defaultProfId,
      dia_semana: selectedDay,
      horario_inicio: "07:30",
      horario_fim: "08:20",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ManagementScheduleItem) => {
    setEditingSchedule(item);
    setFormData({
      turma_id: item.turma_id,
      disciplina_id: item.disciplina_id || (disciplines.find((d) => d.nome === item.disciplina)?.id || 0),
      professor_id: item.professor_id || (professors.find((p) => p.nome === item.professor)?.id || 0),
      dia_semana: item.dia_semana,
      horario_inicio: item.horario_inicio,
      horario_fim: item.horario_fim,
    });
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.turma_id) {
      showFeedback("error", "Selecione uma turma.");
      return;
    }
    if (!formData.disciplina_id) {
      showFeedback("error", "Selecione uma disciplina.");
      return;
    }
    if (!formData.professor_id) {
      showFeedback("error", "Selecione um professor.");
      return;
    }
    if (formData.horario_inicio >= formData.horario_fim) {
      showFeedback("error", "O horário de início deve ser anterior ao horário de término.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        const payload: UpdateSchedulePayload = {
          turma_id: formData.turma_id,
          disciplina_id: formData.disciplina_id,
          professor_id: formData.professor_id,
          dia_semana: formData.dia_semana,
          horario_inicio: formData.horario_inicio,
          horario_fim: formData.horario_fim,
        };
        await managementScheduleService.updateSchedule(editingSchedule.id, payload);
        showFeedback("success", "Aula atualizada na grade com sucesso.");
      } else {
        const payload: CreateSchedulePayload = {
          turma_id: formData.turma_id,
          disciplina_id: formData.disciplina_id,
          professor_id: formData.professor_id,
          dia_semana: formData.dia_semana,
          horario_inicio: formData.horario_inicio,
          horario_fim: formData.horario_fim,
        };
        await managementScheduleService.createSchedule(payload);
        showFeedback("success", "Aula cadastrada na grade com sucesso.");
      }
      setIsModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar aula na grade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const res = await managementScheduleService.deleteSchedule(deletingId.id);
      showFeedback("success", res.mensagem || "Aula excluída com sucesso.");
      setDeletingId(null);
      loadSchedules();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao excluir aula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando matriz de horários..." />;
  }

  if (error && classes.length === 0) {
    return <ErrorMessage message={error} onRetry={loadInitialData} />;
  }

  const filteredSchedules = schedules.filter(
    (s) => s.dia_semana.toLowerCase() === selectedDay.toLowerCase()
  );

  const selectedTurmaObj = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Quadro & Grade Horária
            </span>
            <span className="text-xs text-slate-400 font-medium">| CEEP Pedro Boaretto Neto</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Gestão da Grade Horária</h2>
          <p className="text-xs text-slate-500">
            Cadastre aulas semanais com prevenção inteligente de conflitos de horários e professores.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Aula</span>
          </button>

          <button
            onClick={() => {
              loadInitialData();
              loadSchedules();
            }}
            title="Recarregar grade"
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

      {/* Seletor de Turma */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Turma Selecionada
          </label>
          <p className="text-xs text-slate-400">
            {selectedTurmaObj ? `${selectedTurmaObj.curso} — ${selectedTurmaObj.periodo}` : "Selecione uma turma"}
          </p>
        </div>

        <div className="w-full sm:w-80">
          <select
            value={selectedClassId || ""}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_turma} ({c.periodo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Abas dos Dias da Semana */}
      <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200">
        {daysOfWeek.map((day) => {
          const isSelected = selectedDay === day.full;
          return (
            <button
              key={day.full}
              onClick={() => setSelectedDay(day.full)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{day.full}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de Aulas do Dia */}
      <div className="space-y-3">
        {filteredSchedules.length === 0 ? (
          <Card className="p-10 text-center space-y-3 bg-white border-slate-200">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Nenhuma aula cadastrada para {selectedDay}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Esta turma ainda não possui aulas cadastradas neste dia da semana.
            </p>
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Aula neste Dia</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSchedules.map((item) => (
              <Card
                key={item.id}
                className="p-4 bg-white border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {item.horario_inicio} – {item.horario_fim}
                      </span>
                    </span>

                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {item.dia_semana}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5 mt-1">
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      <span>{item.disciplina}</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 flex items-center space-x-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.professor}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() =>
                      setDeletingId({
                        id: item.id,
                        title: `${item.disciplina} (${item.horario_inicio} às ${item.horario_fim})`,
                      })
                    }
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
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

      {/* MODAL: CRIAR / EDITAR AULA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingSchedule ? "Editar Aula na Grade" : "Nova Aula na Grade"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Turma *</label>
                <select
                  value={formData.turma_id}
                  onChange={(e) => setFormData({ ...formData, turma_id: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_turma} — {c.periodo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Dia da Semana *</label>
                <select
                  value={formData.dia_semana}
                  onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Disciplina *</label>
                  <select
                    value={formData.disciplina_id}
                    onChange={(e) =>
                      setFormData({ ...formData, disciplina_id: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value={0} disabled>
                      Selecione a disciplina...
                    </option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} {d.curso_sigla ? `(${d.curso_sigla})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Professor / Docente *</label>
                  <select
                    value={formData.professor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, professor_id: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value={0} disabled>
                      Selecione o professor...
                    </option>
                    {professors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Horário de Início *</label>
                  <input
                    type="text"
                    placeholder="Ex: 07:30"
                    value={formData.horario_inicio}
                    onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Horário de Término *</label>
                  <input
                    type="text"
                    placeholder="Ex: 08:20"
                    value={formData.horario_fim}
                    onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{editingSchedule ? "Salvar Alterações" : "Cadastrar Aula"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Excluir Aula da Grade</h3>
                <p className="text-xs text-slate-500">Esta ação removerá o horário selecionado.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir a aula{" "}
              <strong className="text-slate-900">{deletingId.title}</strong>? A aula deixará de ser
              exibida no quadro de horários do aluno.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
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

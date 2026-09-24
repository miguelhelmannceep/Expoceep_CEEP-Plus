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
  Filter,
  Users,
  AlertCircle,
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
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

// Períodos e Aulas Padrão (Conceito de Timetable - 1ª a 6ª aula)
interface PeriodSlot {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
}

const STANDARD_PERIODS: PeriodSlot[] = [
  { id: "1", nome: "1ª aula", inicio: "07:30", fim: "08:20" },
  { id: "2", nome: "2ª aula", inicio: "08:20", fim: "09:10" },
  { id: "3", nome: "3ª aula", inicio: "09:25", fim: "10:15" },
  { id: "4", nome: "4ª aula", inicio: "10:15", fim: "11:05" },
  { id: "5", nome: "5ª aula", inicio: "11:15", fim: "12:05" },
  { id: "6", nome: "6ª aula", inicio: "12:05", fim: "12:55" },
];

const DAYS_OF_WEEK = [
  { full: "Segunda-feira", short: "Segunda" },
  { full: "Terça-feira", short: "Terça" },
  { full: "Quarta-feira", short: "Quarta" },
  { full: "Quinta-feira", short: "Quinta" },
  { full: "Sexta-feira", short: "Sexta" },
];

export const ManagementSchedulesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [schedules, setSchedules] = useState<ManagementScheduleItem[]>([]);

  // Filtros
  const [selectedProfessorFilter, setSelectedProfessorFilter] = useState<string>("TODOS");
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>("TODOS");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("TODOS");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ManagementScheduleItem | null>(null);
  const [modalConflictError, setModalConflictError] = useState<string | null>(null);

  // Horário: Preset vs Personalizado
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>("1");
  const [isCustomTime, setIsCustomTime] = useState(false);

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
  const [deletingItem, setDeletingItem] = useState<{ id: number; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Abrir Modal para Criação Rápida (via botão ou clique em célula vazia)
  const handleOpenNewModal = (defaultDay?: string, defaultInicio?: string, defaultFim?: string) => {
    setEditingSchedule(null);
    setModalConflictError(null);

    const defaultTurmaId = selectedClassId || (classes.length > 0 ? classes[0].id : 0);
    const defaultDiscId = disciplines.length > 0 ? disciplines[0].id : 0;
    const defaultProfId = professors.length > 0 ? professors[0].id : 0;

    const inicio = defaultInicio || "07:30";
    const fim = defaultFim || "08:20";
    const dia = defaultDay || (selectedDayFilter !== "TODOS" ? selectedDayFilter : "Segunda-feira");

    // Verificar se corresponde a um preset
    const matchingPreset = STANDARD_PERIODS.find((p) => p.inicio === inicio && p.fim === fim);
    if (matchingPreset) {
      setSelectedPresetSlot(matchingPreset.id);
      setIsCustomTime(false);
    } else {
      setIsCustomTime(true);
    }

    setFormData({
      turma_id: defaultTurmaId,
      disciplina_id: defaultDiscId,
      professor_id: defaultProfId,
      dia_semana: dia,
      horario_inicio: inicio,
      horario_fim: fim,
    });
    setIsModalOpen(true);
  };

  // Abrir Modal para Edição Rápida
  const handleOpenEditModal = (item: ManagementScheduleItem) => {
    setEditingSchedule(item);
    setModalConflictError(null);

    const matchingPreset = STANDARD_PERIODS.find(
      (p) => p.inicio === item.horario_inicio && p.fim === item.horario_fim
    );
    if (matchingPreset) {
      setSelectedPresetSlot(matchingPreset.id);
      setIsCustomTime(false);
    } else {
      setIsCustomTime(true);
    }

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

  // Atualizar horários quando o seletor de preset muda
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetSlot(presetId);
    if (presetId === "custom") {
      setIsCustomTime(true);
    } else {
      setIsCustomTime(false);
      const slot = STANDARD_PERIODS.find((p) => p.id === presetId);
      if (slot) {
        setFormData((prev) => ({
          ...prev,
          horario_inicio: slot.inicio,
          horario_fim: slot.fim,
        }));
      }
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalConflictError(null);

    if (!formData.turma_id) {
      setModalConflictError("Selecione uma turma para a aula.");
      return;
    }
    if (!formData.disciplina_id) {
      setModalConflictError("Selecione uma disciplina para a aula.");
      return;
    }
    if (!formData.professor_id) {
      setModalConflictError("Selecione um professor para a aula.");
      return;
    }
    if (formData.horario_inicio >= formData.horario_fim) {
      setModalConflictError("O horário de início deve ser anterior ao horário de término.");
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
      const msg = err.message || "Erro ao salvar aula na grade.";
      setModalConflictError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      const res = await managementScheduleService.deleteSchedule(deletingItem.id);
      showFeedback("success", res.mensagem || "Aula excluída com sucesso.");
      setDeletingItem(null);
      loadSchedules();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao excluir aula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando central de planejamento de horários..." />;
  }

  if (error && classes.length === 0) {
    return <ErrorMessage message={error} onRetry={loadInitialData} />;
  }

  // Filtragem e correspondência na grade semanal
  const checkOverlap = (item: ManagementScheduleItem, period: PeriodSlot) => {
    return item.horario_inicio < period.fim && item.horario_fim > period.inicio;
  };

  const getSchedulesForSlot = (day: string, period: PeriodSlot) => {
    return schedules.filter((s) => {
      const matchesDay = s.dia_semana.toLowerCase() === day.toLowerCase();
      if (!matchesDay) return false;

      const matchesPeriod = checkOverlap(s, period);
      if (!matchesPeriod) return false;

      // Filtro de Professor
      if (selectedProfessorFilter !== "TODOS") {
        const profMatch =
          s.professor_id === Number(selectedProfessorFilter) ||
          s.professor.toLowerCase() === selectedProfessorFilter.toLowerCase();
        if (!profMatch) return false;
      }

      // Filtro de Disciplina
      if (selectedDisciplineFilter !== "TODOS") {
        const discMatch =
          s.disciplina_id === Number(selectedDisciplineFilter) ||
          s.disciplina.toLowerCase() === selectedDisciplineFilter.toLowerCase();
        if (!discMatch) return false;
      }

      return true;
    });
  };

  const selectedTurmaObj = classes.find((c) => c.id === selectedClassId);

  // Dias a exibir (respeitando o filtro de Dia da Semana)
  const displayedDays =
    selectedDayFilter === "TODOS"
      ? DAYS_OF_WEEK
      : DAYS_OF_WEEK.filter((d) => d.full === selectedDayFilter);

  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 border border-[#2d3661]/20 dark:border-[#7de06f]/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Planejamento de Horários
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">| CEEP Pedro Boaretto Neto</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">Grade Horária & Timetable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monte a grade semanal por turma e professor com prevenção ativa de conflitos de disponibilidade.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenNewModal()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
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
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner de Feedback Global */}
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

      {/* Painel de Filtros e Seleção */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
          <span>Filtros do Planejamento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro 1: Turma Selecionada */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Turma *</span>
            </label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_turma} ({c.periodo})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 2: Professor */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <UserIcon className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Professor</span>
            </label>
            <select
              value={selectedProfessorFilter}
              onChange={(e) => setSelectedProfessorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
            >
              <option value="TODOS">Todos os Professores</option>
              {professors.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 3: Disciplina */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Disciplina</span>
            </label>
            <select
              value={selectedDisciplineFilter}
              onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
            >
              <option value="TODOS">Todas as Disciplinas</option>
              {disciplines.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.nome} {d.curso_sigla ? `(${d.curso_sigla})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 4: Dia da Semana */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Dia da Semana</span>
            </label>
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
            >
              <option value="TODOS">Todos os Dias (Grade Completa)</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.full} value={d.full}>
                  {d.full}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Informações da Turma Ativa */}
        {selectedTurmaObj && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>
              Turma selecionada: <strong className="text-slate-800 dark:text-slate-200">{selectedTurmaObj.nome_turma}</strong> — {selectedTurmaObj.periodo}
            </span>
            <span>
              Total de aulas cadastradas na semana: <strong className="text-slate-800 dark:text-slate-200">{schedules.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Grade Semanal / Timetable Interativa */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Matriz Horária Semanal ({selectedTurmaObj ? selectedTurmaObj.nome_turma : "Turma"})
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Clique no botão <strong>+</strong> de qualquer horário vazio para cadastrar uma aula diretamente
          </span>
        </div>

        {/* Container com rolagem horizontal controlada para mobile/tablet sem quebrar a tela */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
                <th className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-36 shrink-0">
                  Horário
                </th>
                {displayedDays.map((day) => (
                  <th
                    key={day.full}
                    className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    {day.full}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {STANDARD_PERIODS.map((period) => (
                <tr
                  key={period.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Coluna do Horário / Aula */}
                  <td className="py-3 px-4 align-top w-36 bg-slate-50/40 dark:bg-slate-800/20 border-r border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <span className="inline-block text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 px-2 py-0.5 rounded">
                        {period.nome}
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {period.inicio} – {period.fim}
                        </span>
                      </p>
                    </div>
                  </td>

                  {/* Colunas dos Dias da Semana */}
                  {displayedDays.map((day) => {
                    const slotSchedules = getSchedulesForSlot(day.full, period);

                    return (
                      <td
                        key={day.full}
                        className="py-2.5 px-3 align-top border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 min-w-[130px]"
                      >
                        {slotSchedules.length > 0 ? (
                          <div className="space-y-2">
                            {slotSchedules.map((item) => (
                              <div
                                key={item.id}
                                className="group relative bg-slate-50 dark:bg-slate-800/80 hover:bg-[#2d3661]/5 dark:hover:bg-[#2d3661]/20 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 shadow-xs transition-all space-y-1.5"
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 flex items-center space-x-1">
                                    <BookOpen className="w-3 h-3 text-[#2d3661] dark:text-[#7de06f] shrink-0" />
                                    <span>{item.disciplina}</span>
                                  </h4>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5 flex items-center space-x-1">
                                    <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{item.professor}</span>
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400">
                                  <span>{item.horario_inicio} - {item.horario_fim}</span>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Editar aula"
                                      className="p-1 rounded text-slate-500 hover:text-[#2d3661] dark:hover:text-[#7de06f] hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeletingItem({
                                          id: item.id,
                                          title: `${item.disciplina} (${item.dia_semana}, ${item.horario_inicio} às ${item.horario_fim})`,
                                        })
                                      }
                                      title="Remover aula"
                                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenNewModal(day.full, period.inicio, period.fim)}
                            className="w-full h-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-[#2d3661] dark:hover:border-[#7de06f] hover:bg-[#2d3661]/5 dark:hover:bg-[#7de06f]/10 text-slate-400 hover:text-[#2d3661] dark:hover:text-[#7de06f] transition-all flex flex-col items-center justify-center space-y-1 group"
                          >
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-semibold">Adicionar</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CRIAR / EDITAR BLOCO DE AULA COM VALIDAÇÃO DE CONFLITOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingSchedule ? "Editar Aula na Grade" : "Nova Aula na Grade"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerta de Detecção de Conflito */}
            {modalConflictError && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <p className="font-bold">Conflito Detectado</p>
                  <p className="text-[11px] leading-relaxed font-medium">
                    {modalConflictError}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              {/* Campo: Turma */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Turma *</label>
                <select
                  value={formData.turma_id}
                  onChange={(e) => setFormData({ ...formData, turma_id: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_turma} — {c.periodo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo: Dia da Semana */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dia da Semana *</label>
                <select
                  value={formData.dia_semana}
                  onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.full} value={d.full}>
                      {d.full}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo: Seletor Rápido de Horário / Aula */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Horário / Aula *
                </label>
                <select
                  value={isCustomTime ? "custom" : selectedPresetSlot}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                >
                  {STANDARD_PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.inicio} às {p.fim})
                    </option>
                  ))}
                  <option value="custom">Personalizado (Digitar horários)...</option>
                </select>
              </div>

              {/* Horários Personalizados (se selecionado) */}
              {isCustomTime && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Início (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="07:30"
                      value={formData.horario_inicio}
                      onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Término (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="08:20"
                      value={formData.horario_fim}
                      onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Disciplina e Docente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Disciplina *</label>
                  <select
                    value={formData.disciplina_id}
                    onChange={(e) =>
                      setFormData({ ...formData, disciplina_id: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Professor / Docente *</label>
                  <select
                    value={formData.professor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, professor_id: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
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

              {/* Botões do Modal */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] hover:bg-[#222949] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-60"
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
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Excluir Aula da Grade</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Esta ação removerá o horário selecionado.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tem certeza de que deseja excluir a aula{" "}
              <strong className="text-slate-900 dark:text-slate-100">{deletingItem.title}</strong>? A aula deixará de ser
              exibida no quadro de horários dos alunos da turma.
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-60"
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

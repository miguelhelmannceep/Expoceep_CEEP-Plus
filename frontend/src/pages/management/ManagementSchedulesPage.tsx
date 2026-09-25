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
  MapPin,
  Coffee,
  BarChart3,
  ShieldAlert,
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
  PeriodItem,
  CreatePeriodPayload,
  AvailabilityItem,
  CreateAvailabilityPayload,
  CreateDisciplineRulePayload,
  DisciplineBalanceItem,
} from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

// Períodos Padrão de Referência
interface PeriodSlot {
  id: string;
  ordem: number;
  nome: string;
  inicio: string;
  fim: string;
  is_intervalo?: boolean;
}

const DEFAULT_PERIODS: PeriodSlot[] = [
  { id: "1", ordem: 1, nome: "1ª aula", inicio: "07:30", fim: "08:20" },
  { id: "2", ordem: 2, nome: "2ª aula", inicio: "08:20", fim: "09:10" },
  { id: "int", ordem: 3, nome: "Recreio", inicio: "09:10", fim: "09:25", is_intervalo: true },
  { id: "3", ordem: 4, nome: "3ª aula", inicio: "09:25", fim: "10:15" },
  { id: "4", ordem: 5, nome: "4ª aula", inicio: "10:15", fim: "11:05" },
  { id: "5", ordem: 6, nome: "5ª aula", inicio: "11:15", fim: "12:05" },
  { id: "6", ordem: 7, nome: "6ª aula", inicio: "12:05", fim: "12:55" },
];

const DAYS_OF_WEEK = [
  { full: "Segunda-feira", short: "Segunda" },
  { full: "Terça-feira", short: "Terça" },
  { full: "Quarta-feira", short: "Quarta" },
  { full: "Quinta-feira", short: "Quinta" },
  { full: "Sexta-feira", short: "Sexta" },
];

export const ManagementSchedulesPage: React.FC = () => {
  // Sub-abas ativas
  const [activeTab, setActiveTab] = useState<"grade" | "balanco" | "disponibilidade" | "periodos">("grade");

  // Dados centrais
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [schedules, setSchedules] = useState<ManagementScheduleItem[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);

  // Dados específicos dos novos módulos aSc
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);
  const [disciplineBalance, setDisciplineBalance] = useState<DisciplineBalanceItem[]>([]);

  // Filtros da Grade
  const [selectedProfessorFilter, setSelectedProfessorFilter] = useState<string>("TODOS");
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>("TODOS");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("TODOS");

  // Estados de feedback & loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Criar / Editar Aula
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ManagementScheduleItem | null>(null);
  const [modalConflictError, setModalConflictError] = useState<string | null>(null);
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>("1");
  const [isCustomTime, setIsCustomTime] = useState(false);

  const [formData, setFormData] = useState<{
    turma_id: number;
    disciplina_id: number;
    professor_id: number;
    dia_semana: string;
    horario_inicio: string;
    horario_fim: string;
    sala: string;
    duracao: number;
  }>({
    turma_id: 0,
    disciplina_id: 0,
    professor_id: 0,
    dia_semana: "Segunda-feira",
    horario_inicio: "07:30",
    horario_fim: "08:20",
    sala: "Sala 101",
    duracao: 1,
  });

  // Modal: Excluir Aula
  const [deletingItem, setDeletingItem] = useState<{ id: number; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Nova Regra de Carga de Disciplina
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<CreateDisciplineRulePayload>({
    turma_id: 0,
    disciplina_id: 0,
    aulas_semanais: 2,
    max_aulas_dia: 2,
    permitir_aula_dupla: true,
    sala_preferencial: "",
  });

  // Modal: Novo Bloqueio de Disponibilidade
  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [availFormData, setAvailFormData] = useState<CreateAvailabilityPayload>({
    tipo_recurso: "PROFESSOR",
    recurso_id: undefined,
    recurso_identificador: "",
    dia_semana: "Segunda-feira",
    horario_inicio: "07:30",
    horario_fim: "09:10",
    tipo: "INDISPONIVEL",
    motivo: "",
  });

  // Modal: Novo Período
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodFormData, setPeriodFormData] = useState<CreatePeriodPayload>({
    ordem: 1,
    nome: "1ª aula",
    horario_inicio: "07:30",
    horario_fim: "08:20",
    turno: "Manhã",
    is_intervalo: false,
    ativo: true,
  });

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, discData, profData, roomsData, periodsData, availData] = await Promise.all([
        courseClassService.getClasses(),
        disciplineProfessorService.getDisciplines(),
        disciplineProfessorService.getProfessors(),
        managementScheduleService.getRooms().catch(() => []),
        managementScheduleService.getPeriods().catch(() => []),
        managementScheduleService.getAvailabilities().catch(() => []),
      ]);

      setClasses(classesData);
      setDisciplines(discData);
      setProfessors(profData);
      setRooms(roomsData.length > 0 ? roomsData : ["Sala 101", "Sala 102", "Lab Maker", "Lab Informática 1"]);
      setPeriods(periodsData);
      setAvailabilities(availData);

      if (classesData.length > 0) {
        setSelectedClassId((prev) => (prev ? prev : classesData[0].id));
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados do planejamento de horários.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedClassId) return;
    try {
      const [schedData, balanceData] = await Promise.all([
        managementScheduleService.getSchedules(selectedClassId),
        managementScheduleService.getDisciplineBalance(selectedClassId).catch(() => []),
      ]);
      setSchedules(schedData);
      setDisciplineBalance(balanceData);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao carregar aulas da turma.");
    }
  };

  const loadAvailabilities = async () => {
    try {
      const data = await managementScheduleService.getAvailabilities();
      setAvailabilities(data);
    } catch (err: any) {
      showFeedback("error", "Erro ao atualizar disponibilidades.");
    }
  };

  const loadPeriods = async () => {
    try {
      const data = await managementScheduleService.getPeriods();
      setPeriods(data);
    } catch (err: any) {
      showFeedback("error", "Erro ao atualizar períodos.");
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

  // Lista de períodos para a grade: usa os períodos da API se disponíveis ou DEFAULT_PERIODS
  const effectivePeriods: PeriodSlot[] =
    periods.length > 0
      ? periods.map((p) => ({
          id: String(p.id),
          ordem: p.ordem,
          nome: p.nome,
          inicio: p.horario_inicio,
          fim: p.horario_fim,
          is_intervalo: p.is_intervalo,
        }))
      : DEFAULT_PERIODS;

  // Abrir Modal de Criação Rápida de Aula
  const handleOpenNewModal = (defaultDay?: string, defaultInicio?: string, defaultFim?: string) => {
    setEditingSchedule(null);
    setModalConflictError(null);

    const defaultTurmaId = selectedClassId || (classes.length > 0 ? classes[0].id : 0);
    const defaultDiscId = disciplines.length > 0 ? disciplines[0].id : 0;
    const defaultProfId = professors.length > 0 ? professors[0].id : 0;

    const inicio = defaultInicio || "07:30";
    const fim = defaultFim || "08:20";
    const dia = defaultDay || (selectedDayFilter !== "TODOS" ? selectedDayFilter : "Segunda-feira");

    const matchingPreset = effectivePeriods.find((p) => p.inicio === inicio && p.fim === fim && !p.is_intervalo);
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
      sala: rooms.length > 0 ? rooms[0] : "Sala 101",
      duracao: 1,
    });
    setIsModalOpen(true);
  };

  // Abrir Modal de Edição de Aula
  const handleOpenEditModal = (item: ManagementScheduleItem) => {
    setEditingSchedule(item);
    setModalConflictError(null);

    const matchingPreset = effectivePeriods.find(
      (p) => p.inicio === item.horario_inicio && p.fim === item.horario_fim && !p.is_intervalo
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
      sala: item.sala || (rooms.length > 0 ? rooms[0] : "Sala 101"),
      duracao: item.duracao || 1,
    });
    setIsModalOpen(true);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetSlot(presetId);
    if (presetId === "custom") {
      setIsCustomTime(true);
    } else {
      setIsCustomTime(false);
      const slot = effectivePeriods.find((p) => p.id === presetId);
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
          sala: formData.sala,
          duracao: formData.duracao,
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
          sala: formData.sala,
          duracao: formData.duracao,
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

  // Funções da aba Carga / Regras de Disciplina
  const handleOpenRuleModal = (discId?: number) => {
    const defaultTurmaId = selectedClassId || (classes.length > 0 ? classes[0].id : 0);
    const existingBalance = discId ? disciplineBalance.find((b) => b.disciplina_id === discId) : null;

    setRuleFormData({
      turma_id: defaultTurmaId,
      disciplina_id: discId || (disciplines.length > 0 ? disciplines[0].id : 0),
      aulas_semanais: existingBalance ? existingBalance.aulas_semanais_planejadas || 2 : 2,
      max_aulas_dia: 2,
      permitir_aula_dupla: true,
      sala_preferencial: existingBalance?.sala_preferencial || "",
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveDisciplineRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.turma_id || !ruleFormData.disciplina_id) {
      showFeedback("error", "Selecione turma e disciplina.");
      return;
    }
    setIsSubmitting(true);
    try {
      await managementScheduleService.upsertDisciplineRule(ruleFormData);
      showFeedback("success", "Meta de carga horária salva com sucesso.");
      setIsRuleModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar regra de disciplina.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções da aba Disponibilidade
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availFormData.recurso_identificador.trim()) {
      showFeedback("error", "Informe a identificação do recurso.");
      return;
    }
    setIsSubmitting(true);
    try {
      await managementScheduleService.createAvailability(availFormData);
      showFeedback("success", "Bloqueio de disponibilidade registrado.");
      setIsAvailModalOpen(false);
      loadAvailabilities();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao criar restrição de disponibilidade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAvailability = async (id: number) => {
    try {
      await managementScheduleService.deleteAvailability(id);
      showFeedback("success", "Restrição removida com sucesso.");
      loadAvailabilities();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao remover restrição.");
    }
  };

  // Funções da aba Períodos
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await managementScheduleService.createPeriod(periodFormData);
      showFeedback("success", "Período cadastrado com sucesso.");
      setIsPeriodModalOpen(false);
      loadPeriods();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao cadastrar período.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePeriod = async (id: number) => {
    try {
      await managementScheduleService.deletePeriod(id);
      showFeedback("success", "Período removido.");
      loadPeriods();
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao excluir período.");
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando central de planejamento de horários aSc..." />;
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

      if (selectedProfessorFilter !== "TODOS") {
        const profMatch =
          s.professor_id === Number(selectedProfessorFilter) ||
          s.professor.toLowerCase() === selectedProfessorFilter.toLowerCase();
        if (!profMatch) return false;
      }

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
              Planejamento Escolar
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">| Modelo aSc TimeTables</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">Central de Horários & Recursos</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Validação ativa de turmas, docentes e salas, controle de carga semanal e gestão de intervalos institucionais.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === "grade" && (
            <button
              onClick={() => handleOpenNewModal()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Aula</span>
            </button>
          )}

          {activeTab === "balanco" && (
            <button
              onClick={() => handleOpenRuleModal()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Configurar Disciplina</span>
            </button>
          )}

          {activeTab === "disponibilidade" && (
            <button
              onClick={() => setIsAvailModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Bloqueio</span>
            </button>
          )}

          {activeTab === "periodos" && (
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2d3661] hover:bg-[#232b4d] active:bg-[#1a203a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Período</span>
            </button>
          )}

          <button
            onClick={() => {
              loadInitialData();
              loadSchedules();
            }}
            title="Recarregar dados"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navegação de Sub-abas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("grade")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "grade"
              ? "border-[#2d3661] dark:border-[#7de06f] text-[#2d3661] dark:text-[#7de06f]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Grade Semanal (Timetable)</span>
        </button>

        <button
          onClick={() => setActiveTab("balanco")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "balanco"
              ? "border-[#2d3661] dark:border-[#7de06f] text-[#2d3661] dark:text-[#7de06f]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Carga Semanal & Balanço</span>
          {disciplineBalance.some((b) => b.balanco_status === "PENDENTE") && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("disponibilidade")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "disponibilidade"
              ? "border-[#2d3661] dark:border-[#7de06f] text-[#2d3661] dark:text-[#7de06f]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Disponibilidade & Bloqueios</span>
        </button>

        <button
          onClick={() => setActiveTab("periodos")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "periodos"
              ? "border-[#2d3661] dark:border-[#7de06f] text-[#2d3661] dark:text-[#7de06f]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Períodos & Intervalos</span>
        </button>
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

      {/* ABA 1: GRADE SEMANAL (TIMETABLE PRINCIPAL) */}
      {activeTab === "grade" && (
        <div className="space-y-5">
          {/* Painel de Filtros e Seleção */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Filtros do Planejamento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro 1: Turma */}
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

            {/* Informações da Turma & Balanço Rápido de Aulas */}
            {selectedTurmaObj && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div>
                  Turma: <strong className="text-slate-800 dark:text-slate-200">{selectedTurmaObj.nome_turma}</strong> — {selectedTurmaObj.periodo}
                </div>
                <div>
                  Aulas cadastradas: <strong className="text-slate-800 dark:text-slate-200">{schedules.length}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Balanço Pedagógico Rápido (aSc Status) */}
          {disciplineBalance.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 shrink-0">
                <BarChart3 className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Balanço Semanal de Disciplinas:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {disciplineBalance.slice(0, 6).map((item) => (
                  <span
                    key={item.disciplina_id}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center space-x-1.5 ${
                      item.balanco_status === "OK"
                        ? "bg-[#4aaa3c]/10 text-emerald-800 dark:text-[#7de06f] border-[#4aaa3c]/30"
                        : item.balanco_status === "PENDENTE"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200"
                    }`}
                  >
                    <span>{item.disciplina_sigla || item.disciplina_nome}:</span>
                    <strong>{item.aulas_alocadas_na_grade}/{item.aulas_semanais_planejadas}</strong>
                  </span>
                ))}
                {disciplineBalance.length > 6 && (
                  <button
                    onClick={() => setActiveTab("balanco")}
                    className="text-[11px] text-[#2d3661] dark:text-[#7de06f] font-bold hover:underline"
                  >
                    +{disciplineBalance.length - 6} outras...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Matriz Horária Semanal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Matriz Horária Semanal ({selectedTurmaObj ? selectedTurmaObj.nome_turma : "Turma"})
              </p>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Clique no botão <strong>+</strong> de qualquer horário vazio para cadastrar uma aula
              </span>
            </div>

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
                  {effectivePeriods.map((period) => {
                    // Caso seja período de intervalo institucional / recreio
                    if (period.is_intervalo) {
                      return (
                        <tr
                          key={period.id}
                          className="bg-amber-50/60 dark:bg-amber-950/20 border-y border-amber-200/50 dark:border-amber-900/30"
                        >
                          <td className="py-2.5 px-4 align-middle w-36 bg-amber-100/40 dark:bg-amber-950/40 border-r border-amber-200/50 dark:border-amber-900/40">
                            <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
                              <Coffee className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs font-bold">{period.nome}</span>
                            </div>
                            <p className="text-[10px] font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                              {period.inicio} – {period.fim}
                            </p>
                          </td>
                          <td
                            colSpan={displayedDays.length}
                            className="py-2.5 px-4 text-center text-xs font-semibold text-amber-800 dark:text-amber-300 tracking-wide"
                          >
                            ☕ Intervalo / Recreio Escolar — Horário bloqueado para agendamento de aulas regulares
                          </td>
                        </tr>
                      );
                    }

                    return (
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
                              className="py-2.5 px-3 align-top border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 min-w-[140px]"
                            >
                              {slotSchedules.length > 0 ? (
                                <div className="space-y-2">
                                  {slotSchedules.map((item) => (
                                    <div
                                      key={item.id}
                                      className="group relative bg-slate-50 dark:bg-slate-800/80 hover:bg-[#2d3661]/5 dark:hover:bg-[#2d3661]/20 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 shadow-xs transition-all space-y-1.5"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 flex items-center space-x-1">
                                            <BookOpen className="w-3 h-3 text-[#2d3661] dark:text-[#7de06f] shrink-0" />
                                            <span>{item.disciplina}</span>
                                          </h4>
                                          {item.duracao && item.duracao > 1 && (
                                            <span className="text-[9px] font-bold bg-[#2d3661]/10 text-[#2d3661] dark:text-[#7de06f] px-1.5 py-0.2 rounded">
                                              Dupla
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5 flex items-center space-x-1">
                                          <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span>{item.professor}</span>
                                        </p>
                                        {item.sala && (
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center space-x-1 mt-0.5 font-medium">
                                            <MapPin className="w-3 h-3 text-[#4aaa3c] shrink-0" />
                                            <span>{item.sala}</span>
                                          </p>
                                        )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CARGA SEMANAL & BALANÇO PEDAGÓGICO */}
      {activeTab === "balanco" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                  <span>Balanço da Carga Horária — {selectedTurmaObj?.nome_turma}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compare as aulas semanais planejadas com as aulas efetivamente alocadas na grade horária.
                </p>
              </div>

              <button
                onClick={() => handleOpenRuleModal()}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Definir Meta de Disciplina</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-4">Disciplina</th>
                    <th className="py-3 px-4 text-center">Aulas Planejadas</th>
                    <th className="py-3 px-4 text-center">Aulas na Grade</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Espaço / Sala Preferencial</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {disciplineBalance.length > 0 ? (
                    disciplineBalance.map((b) => (
                      <tr key={b.disciplina_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {b.disciplina_nome} {b.disciplina_sigla ? `(${b.disciplina_sigla})` : ""}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {b.aulas_semanais_planejadas} aulas
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {b.aulas_alocadas_na_grade} aulas
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              b.balanco_status === "OK"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : b.balanco_status === "PENDENTE"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {b.balanco_status === "OK" ? "Completo (OK)" : b.balanco_status === "PENDENTE" ? "Pendente" : "Excedente"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {b.sala_preferencial || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenRuleModal(b.disciplina_id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#2d3661] dark:hover:text-[#7de06f] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Editar Meta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Nenhuma meta de disciplina cadastrada para esta turma ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: DISPONIBILIDADES & RESTRIÇÕES DE RECURSOS */}
      {activeTab === "disponibilidade" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                  <span>Regras de Disponibilidade e Bloqueios</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure dias e horários em que docentes, turmas ou salas não podem ser alocados.
                </p>
              </div>

              <button
                onClick={() => setIsAvailModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Bloqueio</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Recurso</th>
                    <th className="py-3 px-4">Dia da Semana</th>
                    <th className="py-3 px-4">Horário</th>
                    <th className="py-3 px-4">Tipo de Restrição</th>
                    <th className="py-3 px-4">Motivo / Justificativa</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {availabilities.length > 0 ? (
                    availabilities.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-[#2d3661] dark:text-[#7de06f]">
                          {a.tipo_recurso}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {a.recurso_identificador}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {a.dia_semana}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {a.horario_inicio} – {a.horario_fim}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              a.tipo === "INDISPONIVEL"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {a.tipo === "INDISPONIVEL" ? "INDISPONÍVEL (Bloqueio Rígido)" : "PREFERÊNCIA"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">
                          {a.motivo || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteAvailability(a.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Remover Restrição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhuma restrição de disponibilidade cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: PERÍODOS & INTERVALOS */}
      {activeTab === "periodos" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                  <span>Estrutura de Períodos e Intervalos</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Grade de aulas institucionais (1ª a 6ª aula) e intervalo/recreio sagrado.
                </p>
              </div>

              <button
                onClick={() => setIsPeriodModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Período</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-4">Ordem</th>
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Horário Início</th>
                    <th className="py-3 px-4">Horário Fim</th>
                    <th className="py-3 px-4">Turno</th>
                    <th className="py-3 px-4 text-center">Tipo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periods.length > 0 ? (
                    periods.map((p) => (
                      <tr
                        key={p.id}
                        className={p.is_intervalo ? "bg-amber-50/50 dark:bg-amber-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"}
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          #{p.ordem}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {p.nome}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {p.horario_inicio}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {p.horario_fim}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {p.turno}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.is_intervalo ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                              ☕ Intervalo / Recreio
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Aula Regular
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Remover Período"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhum período cadastrado no banco.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR AULA NA GRADE */}
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
                  <p className="font-bold">Conflito ou Restrição Detectada</p>
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
                  Horário / Período *
                </label>
                <select
                  value={isCustomTime ? "custom" : selectedPresetSlot}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                >
                  {effectivePeriods
                    .filter((p) => !p.is_intervalo)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.inicio} às {p.fim})
                      </option>
                    ))}
                  <option value="custom">Personalizado (Digitar horários)...</option>
                </select>
              </div>

              {/* Horários Personalizados */}
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

              {/* Duração e Sala */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duração / Períodos</label>
                  <select
                    value={formData.duracao}
                    onChange={(e) => setFormData({ ...formData, duracao: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                  >
                    <option value={1}>1 Aula Regular (50 min)</option>
                    <option value={2}>Aula Dupla Consecutiva (2 períodos)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-[#4aaa3c]" />
                    <span>Espaço Físico / Sala</span>
                  </label>
                  <input
                    type="text"
                    list="rooms-list"
                    value={formData.sala}
                    onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                    placeholder="Ex: Sala 101, Lab Maker"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20 focus:border-[#2d3661] transition-all"
                  />
                  <datalist id="rooms-list">
                    {rooms.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

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

      {/* MODAL: DEFINIR META DE DISCIPLINA (CARGA SEMANAL) */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Meta de Carga Horária Semanal
                </h3>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDisciplineRule} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Turma *</label>
                <select
                  value={ruleFormData.turma_id}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, turma_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_turma} ({c.periodo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Disciplina *</label>
                <select
                  value={ruleFormData.disciplina_id}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, disciplina_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                >
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome} {d.curso_sigla ? `(${d.curso_sigla})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aulas Semanais *</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={ruleFormData.aulas_semanais}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, aulas_semanais: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Máx Aulas/Dia</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={ruleFormData.max_aulas_dia}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, max_aulas_dia: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Espaço / Sala Preferencial</label>
                <input
                  type="text"
                  placeholder="Ex: Lab Maker, Sala 101"
                  value={ruleFormData.sala_preferencial || ""}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, sala_preferencial: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="permitir_dupla"
                  checked={ruleFormData.permitir_aula_dupla}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, permitir_aula_dupla: e.target.checked })}
                  className="rounded text-[#2d3661] focus:ring-[#2d3661]"
                />
                <label htmlFor="permitir_dupla" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Permitir aula dupla consecutiva para esta disciplina
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] text-white rounded-xl text-xs font-semibold"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO BLOQUEIO DE DISPONIBILIDADE */}
      {isAvailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Novo Bloqueio de Disponibilidade
                </h3>
              </div>
              <button onClick={() => setIsAvailModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Recurso *</label>
                  <select
                    value={availFormData.tipo_recurso}
                    onChange={(e) => {
                      const t = e.target.value;
                      setAvailFormData({
                        ...availFormData,
                        tipo_recurso: t,
                        recurso_identificador: "",
                        recurso_id: undefined,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="PROFESSOR">Professor</option>
                    <option value="TURMA">Turma</option>
                    <option value="SALA">Sala / Espaço</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Restrição</label>
                  <select
                    value={availFormData.tipo}
                    onChange={(e) => setAvailFormData({ ...availFormData, tipo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="INDISPONIVEL">INDISPONÍVEL (Bloqueio Rígido)</option>
                    <option value="PREFERENCIA">PREFERÊNCIA (Suave)</option>
                  </select>
                </div>
              </div>

              {/* Seletor específico do Recurso */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Identificação do Recurso *</label>
                {availFormData.tipo_recurso === "PROFESSOR" ? (
                  <select
                    value={availFormData.recurso_identificador}
                    onChange={(e) => {
                      const prof = professors.find((p) => p.nome === e.target.value);
                      setAvailFormData({
                        ...availFormData,
                        recurso_identificador: e.target.value,
                        recurso_id: prof ? prof.id : undefined,
                      });
                    }}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Selecione o professor...</option>
                    {professors.map((p) => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                ) : availFormData.tipo_recurso === "TURMA" ? (
                  <select
                    value={availFormData.recurso_identificador}
                    onChange={(e) => {
                      const t = classes.find((c) => c.nome_turma === e.target.value);
                      setAvailFormData({
                        ...availFormData,
                        recurso_identificador: e.target.value,
                        recurso_id: t ? t.id : undefined,
                      });
                    }}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Selecione a turma...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.nome_turma}>{c.nome_turma} ({c.periodo})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Sala 101, Lab Maker"
                    value={availFormData.recurso_identificador}
                    onChange={(e) => setAvailFormData({ ...availFormData, recurso_identificador: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dia da Semana *</label>
                <select
                  value={availFormData.dia_semana}
                  onChange={(e) => setAvailFormData({ ...availFormData, dia_semana: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.full} value={d.full}>{d.full}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Início (HH:MM) *</label>
                  <input
                    type="text"
                    placeholder="07:30"
                    value={availFormData.horario_inicio}
                    onChange={(e) => setAvailFormData({ ...availFormData, horario_inicio: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Término (HH:MM) *</label>
                  <input
                    type="text"
                    placeholder="09:10"
                    value={availFormData.horario_fim}
                    onChange={(e) => setAvailFormData({ ...availFormData, horario_fim: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Motivo / Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Reunião pedagógica, Atendimento, Manutenção"
                  value={availFormData.motivo || ""}
                  onChange={(e) => setAvailFormData({ ...availFormData, motivo: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAvailModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] text-white rounded-xl text-xs font-semibold"
                >
                  Registrar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PERÍODO */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-[#2d3661] dark:text-[#7de06f]">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Novo Período / Intervalo
                </h3>
              </div>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ordem *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={periodFormData.ordem}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, ordem: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Turno</label>
                  <select
                    value={periodFormData.turno}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, turno: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome do Período *</label>
                <input
                  type="text"
                  placeholder="Ex: 1ª aula, Recreio"
                  value={periodFormData.nome}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, nome: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Início (HH:MM) *</label>
                  <input
                    type="text"
                    placeholder="07:30"
                    value={periodFormData.horario_inicio}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, horario_inicio: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fim (HH:MM) *</label>
                  <input
                    type="text"
                    placeholder="08:20"
                    value={periodFormData.horario_fim}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, horario_fim: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_intervalo"
                  checked={periodFormData.is_intervalo}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, is_intervalo: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="is_intervalo" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Este período é um Intervalo / Recreio (bloqueia agendamento de aulas)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#2d3661] text-white rounded-xl text-xs font-semibold"
                >
                  Salvar Período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE AULA */}
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

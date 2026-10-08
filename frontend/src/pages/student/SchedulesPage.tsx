import React, { useState, useEffect, useMemo, useRef } from "react";
import { scheduleService } from "../../services/schedule.service";
import type { ClassOption, ScheduleItem } from "../../types";
import { Card } from "../../components/common/Card";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  Calendar,
  Clock,
  User as UserIcon,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Coffee,
  MapPin,
  Sun,
  Sunset,
  Check,
} from "lucide-react";

interface PeriodSlot {
  id: string;
  ordem: number;
  nome: string;
  inicio: string;
  fim: string;
  is_intervalo?: boolean;
}

const PERIODS_MANHA: PeriodSlot[] = [
  { id: "m1", ordem: 1, nome: "1ª aula", inicio: "07:10", fim: "08:00" },
  { id: "m2", ordem: 2, nome: "2ª aula", inicio: "08:00", fim: "08:50" },
  { id: "m3", ordem: 3, nome: "3ª aula", inicio: "08:50", fim: "09:40" },
  { id: "mint", ordem: 4, nome: "Intervalo / Recreio", inicio: "09:40", fim: "09:55", is_intervalo: true },
  { id: "m4", ordem: 5, nome: "4ª aula", inicio: "09:55", fim: "10:45" },
  { id: "m5", ordem: 6, nome: "5ª aula", inicio: "10:45", fim: "11:35" },
  { id: "m6", ordem: 7, nome: "6ª aula", inicio: "11:35", fim: "12:25" },
];

const PERIODS_TARDE: PeriodSlot[] = [
  { id: "t1", ordem: 1, nome: "1ª aula", inicio: "13:10", fim: "14:00" },
  { id: "t2", ordem: 2, nome: "2ª aula", inicio: "14:00", fim: "14:50" },
  { id: "t3", ordem: 3, nome: "3ª aula", inicio: "14:50", fim: "15:40" },
  { id: "tint", ordem: 4, nome: "Intervalo / Recreio", inicio: "15:40", fim: "15:55", is_intervalo: true },
  { id: "t4", ordem: 5, nome: "4ª aula", inicio: "15:55", fim: "16:45" },
  { id: "t5", ordem: 6, nome: "5ª aula", inicio: "16:45", fim: "17:35" },
  { id: "t6", ordem: 7, nome: "6ª aula", inicio: "17:35", fim: "18:25" },
];

const normalizeTurno = (periodo?: string | null): string => {
  if (!periodo) return "Manhã";
  return periodo.toLowerCase().includes("tarde") ? "Tarde" : "Manhã";
};

interface CeepDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CeepDropdownProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabledPlaceholder?: string;
  disabled?: boolean;
  options: CeepDropdownOption[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  selectedDisplayIcon?: React.ReactNode;
  defaultIcon?: React.ReactNode;
}

const CeepDropdown: React.FC<CeepDropdownProps> = ({
  id,
  label,
  value,
  placeholder,
  disabledPlaceholder,
  disabled = false,
  options,
  isOpen,
  onToggle,
  onSelect,
  selectedDisplayIcon,
  defaultIcon,
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`space-y-1.5 relative ${isOpen ? "z-30" : "z-10"}`}>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        disabled={disabled}
        onClick={onToggle}
        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs text-left flex items-center justify-between transition-all outline-none select-none ${
          disabled
            ? "bg-slate-100/60 dark:bg-slate-800/40 border-2 border-slate-200/80 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
            : isOpen
            ? "bg-white dark:bg-slate-900 border-2 border-[#2d3661] dark:border-[#4aaa3c] ring-2 ring-[#2d3661]/15 dark:ring-[#4aaa3c]/20 text-slate-900 dark:text-slate-100 shadow-sm"
            : "bg-slate-50/80 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/15 dark:focus:ring-[#4aaa3c]/20 text-slate-900 dark:text-slate-100 cursor-pointer shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          <span className="shrink-0">
            {selectedOption ? selectedDisplayIcon || defaultIcon : defaultIcon}
          </span>
          <span
            className={`truncate ${
              disabled
                ? "font-medium text-slate-400 dark:text-slate-500"
                : selectedOption
                ? "font-bold text-slate-900 dark:text-slate-100"
                : "font-medium text-slate-500 dark:text-slate-400"
            }`}
          >
            {disabled
              ? disabledPlaceholder || placeholder
              : selectedOption
              ? selectedOption.label
              : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            disabled
              ? "text-slate-300 dark:text-slate-600"
              : isOpen
              ? "rotate-180 text-[#2d3661] dark:text-[#7de06f]"
              : "text-slate-400"
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          id={`${id}-menu`}
          role="listbox"
          aria-labelledby={id}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 overflow-hidden py-1 z-40 max-h-60 overflow-y-auto"
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-400 text-center italic">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(option.value)}
                  className={`w-full px-3.5 py-2.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#2d3661]/10 dark:bg-[#7de06f]/15 text-[#2d3661] dark:text-[#7de06f] font-bold"
                      : "text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#4aaa3c] dark:text-[#7de06f] shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const SchedulesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<string>("");
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"turno" | "curso" | "turma" | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("Segunda-feira");
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysOfWeek = [
    { full: "Segunda-feira", short: "Seg" },
    { full: "Terça-feira", short: "Ter" },
    { full: "Quarta-feira", short: "Qua" },
    { full: "Quinta-feira", short: "Qui" },
    { full: "Sexta-feira", short: "Sex" },
  ];

  // 1. Carregar turmas e restaurar persistência hierárquica válida
  useEffect(() => {
    scheduleService
      .getClasses()
      .then((data) => {
        setClasses(data);
        const savedId = localStorage.getItem("ceep_student_selected_class_id");
        if (savedId) {
          const found = data.find((c) => String(c.id) === savedId);
          if (found && found.periodo && found.curso) {
            const turno = normalizeTurno(found.periodo);
            const isValidShift = turno === "Manhã" || turno === "Tarde";
            const isValidCourse = data.some(
              (c) => normalizeTurno(c.periodo) === turno && c.curso === found.curso
            );
            const isValidClass = data.some(
              (c) =>
                normalizeTurno(c.periodo) === turno &&
                c.curso === found.curso &&
                c.id === found.id
            );
            if (isValidShift && isValidCourse && isValidClass) {
              setSelectedTurno(turno);
              setSelectedCurso(found.curso);
              setSelectedClassId(found.id);
              return;
            }
          }
          localStorage.removeItem("ceep_student_selected_class_id");
        }
        // Sem seleção prévia válida: aguarda seleção hierárquica do aluno
        setSelectedTurno("");
        setSelectedCurso("");
        setSelectedClassId(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingClasses(false));
  }, []);

  // 2. Carregar horários ao selecionar turma
  useEffect(() => {
    if (!selectedClassId) {
      setSchedules([]);
      return;
    }
    setIsLoadingSchedules(true);
    scheduleService
      .getSchedulesByClass(selectedClassId)
      .then(setSchedules)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingSchedules(false));
  }, [selectedClassId]);

  // Derivação dinâmica dos cursos disponíveis para o turno selecionado
  const availableCourses = useMemo(() => {
    if (!selectedTurno) return [];
    const coursesSet = new Set<string>();
    classes.forEach((c) => {
      if (normalizeTurno(c.periodo) === selectedTurno && c.curso) {
        coursesSet.add(c.curso);
      }
    });
    return Array.from(coursesSet).sort((a, b) => a.localeCompare(b));
  }, [classes, selectedTurno]);

  // Derivação dinâmica das turmas disponíveis para o turno e curso selecionados
  const availableClasses = useMemo(() => {
    if (!selectedTurno || !selectedCurso) return [];
    return classes
      .filter(
        (c) =>
          normalizeTurno(c.periodo) === selectedTurno &&
          c.curso === selectedCurso
      )
      .sort((a, b) => a.nome_turma.localeCompare(b.nome_turma));
  }, [classes, selectedTurno, selectedCurso]);

  // Handlers de alteração hierárquica
  const handleTurnoChange = (newTurno: string) => {
    setOpenDropdown(null);
    if (newTurno === selectedTurno) return;
    setSelectedTurno(newTurno);
    setSelectedCurso("");
    setSelectedClassId(null);
    localStorage.removeItem("ceep_student_selected_class_id");
  };

  const handleCursoChange = (newCurso: string) => {
    setOpenDropdown(null);
    if (newCurso === selectedCurso) return;
    setSelectedCurso(newCurso);
    setSelectedClassId(null);
    localStorage.removeItem("ceep_student_selected_class_id");
  };

  const handleClassChange = (newClassIdStr: string) => {
    setOpenDropdown(null);
    if (!newClassIdStr) {
      setSelectedClassId(null);
      localStorage.removeItem("ceep_student_selected_class_id");
      return;
    }
    const id = Number(newClassIdStr);
    setSelectedClassId(id);
    localStorage.setItem("ceep_student_selected_class_id", String(id));
  };

  // Fechar dropdowns abertos ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown]);

  // Opções para os seletores customizados
  const turnoOptions: CeepDropdownOption[] = useMemo(
    () => [
      {
        value: "Manhã",
        label: "Manhã",
        icon: <Sun className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f] shrink-0" />,
      },
      {
        value: "Tarde",
        label: "Tarde",
        icon: <Sunset className="w-4 h-4 text-[#4aaa3c] dark:text-[#7de06f] shrink-0" />,
      },
    ],
    []
  );

  const cursoOptions: CeepDropdownOption[] = useMemo(() => {
    return availableCourses.map((curso) => ({
      value: curso,
      label: curso,
      icon: <BookOpen className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f] shrink-0" />,
    }));
  }, [availableCourses]);

  const turmaOptions: CeepDropdownOption[] = useMemo(() => {
    return availableClasses.map((turma) => ({
      value: String(turma.id),
      label: turma.nome_turma,
      icon: <GraduationCap className="w-4 h-4 text-[#4aaa3c] dark:text-[#7de06f] shrink-0" />,
    }));
  }, [availableClasses]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const isTarde = selectedClass ? normalizeTurno(selectedClass.periodo) === "Tarde" : selectedTurno === "Tarde";
  const currentPeriods = isTarde ? PERIODS_TARDE : PERIODS_MANHA;

  const filteredSchedules = schedules.filter(
    (item) => item.dia_semana.toLowerCase() === selectedDay.toLowerCase()
  );

  const checkOverlap = (item: ScheduleItem, period: PeriodSlot) => {
    return item.horario_inicio < period.fim && item.horario_fim > period.inicio;
  };

  const filledPeriodsCount = currentPeriods.filter(
    (p) =>
      !p.is_intervalo &&
      filteredSchedules.some((s) => checkOverlap(s, p))
  ).length;

  if (isLoadingClasses) {
    return <ListSkeleton count={4} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-[#2d3661] dark:text-[#7de06f]" />
          <span>Quadro de Horários</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Consulte os horários e disciplinas selecionando seu turno, curso técnico e turma.
        </p>
      </div>

      {/* Seletor Hierárquico Institucional de Turma */}
      <div
        ref={dropdownContainerRef}
        className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3.5 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Seleção de Turma
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Turno */}
          <CeepDropdown
            id="select-turno"
            label="1. Turno"
            value={selectedTurno}
            placeholder="Selecione o turno..."
            options={turnoOptions}
            isOpen={openDropdown === "turno"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "turno" ? null : "turno")
            }
            onSelect={handleTurnoChange}
            selectedDisplayIcon={
              selectedTurno === "Manhã" ? (
                <Sun className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f] shrink-0" />
              ) : selectedTurno === "Tarde" ? (
                <Sunset className="w-4 h-4 text-[#4aaa3c] dark:text-[#7de06f] shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              )
            }
            defaultIcon={<Clock className="w-4 h-4 text-slate-400 shrink-0" />}
          />

          {/* 2. Curso Técnico */}
          <CeepDropdown
            id="select-curso"
            label="2. Curso Técnico"
            value={selectedCurso}
            placeholder="Selecione o curso..."
            disabledPlaceholder="Selecione primeiro o turno"
            disabled={!selectedTurno}
            options={cursoOptions}
            isOpen={openDropdown === "curso"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "curso" ? null : "curso")
            }
            onSelect={handleCursoChange}
            selectedDisplayIcon={
              <BookOpen className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f] shrink-0" />
            }
            defaultIcon={
              <BookOpen
                className={`w-4 h-4 shrink-0 ${
                  !selectedTurno
                    ? "text-slate-300 dark:text-slate-600"
                    : "text-slate-400"
                }`}
              />
            }
          />

          {/* 3. Turma */}
          <CeepDropdown
            id="select-turma"
            label="3. Turma"
            value={selectedClassId ? String(selectedClassId) : ""}
            placeholder="Selecione sua turma..."
            disabledPlaceholder="Selecione primeiro o curso"
            disabled={!selectedCurso}
            options={turmaOptions}
            isOpen={openDropdown === "turma"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "turma" ? null : "turma")
            }
            onSelect={handleClassChange}
            selectedDisplayIcon={
              <GraduationCap className="w-4 h-4 text-[#4aaa3c] dark:text-[#7de06f] shrink-0" />
            }
            defaultIcon={
              <GraduationCap
                className={`w-4 h-4 shrink-0 ${
                  !selectedCurso
                    ? "text-slate-300 dark:text-slate-600"
                    : "text-slate-400"
                }`}
              />
            }
          />
        </div>

        {/* Resumo da Turma Ativa */}
        {selectedClass && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Visualizando:{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-bold">
                {selectedClass.nome_turma}
              </strong>{" "}
              • {selectedClass.curso}
            </span>
            <span className="text-[11px] font-bold text-[#4aaa3c] dark:text-[#7de06f] bg-[#4aaa3c]/10 dark:bg-[#7de06f]/10 px-2 py-0.5 rounded-md">
              Turno {selectedClass.periodo}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo: Estado inicial sem seleção ou grade horária da turma */}
      {!selectedClassId ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 transition-colors">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#2d3661]/10 dark:bg-[#7de06f]/20 text-[#2d3661] dark:text-[#7de06f] flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Selecione sua turma para visualizar os horários
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Escolha o turno, o curso técnico e a sua turma nos campos acima para consultar a grade semanal completa.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Seletor de Dia da Semana */}
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {daysOfWeek.map((day) => {
              const isSelected = selectedDay === day.full;
              return (
                <button
                  key={day.full}
                  onClick={() => setSelectedDay(day.full)}
                  aria-label={`Filtrar por ${day.full}`}
                  className={`flex-1 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-[#2d3661] dark:bg-[#4aaa3c] text-white shadow-sm shadow-[#2d3661]/20"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{day.short}</span>
                </button>
              );
            })}
          </div>

          {/* Lista de Aulas do Dia */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedDay} {selectedClass ? `• Turno: ${selectedClass.periodo}` : ""}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {filledPeriodsCount} de 6 aulas programadas
              </span>
            </div>

            {isLoadingSchedules ? (
              <ListSkeleton count={6} />
            ) : filteredSchedules.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Sem aulas cadastradas"
                description="Nenhuma disciplina cadastrada para este dia nesta turma."
              />
            ) : (
              <div className="space-y-2.5">
                {currentPeriods.map((period) => {
                  // 1. RECREIO / INTERVALO ESCOLAR
                  if (period.is_intervalo) {
                    return (
                      <div
                        key={period.id}
                        className="p-3.5 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex items-center justify-between transition-colors shadow-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-[#2d3661] dark:text-[#7de06f] flex items-center justify-center shrink-0">
                            <Coffee className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                Intervalo / Recreio
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Pausa pedagógica para lanche e descanso
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/80 px-2.5 py-1 rounded-lg">
                          {period.inicio} – {period.fim}
                        </span>
                      </div>
                    );
                  }

                  // 2. PERÍODO LETIVO
                  const matchingSchedules = filteredSchedules.filter((item) =>
                    checkOverlap(item, period)
                  );

                  // Período vago / sem aula
                  if (matchingSchedules.length === 0) {
                    return (
                      <div
                        key={period.id}
                        className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 flex items-center justify-between text-slate-400 dark:text-slate-500 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {period.nome}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {period.inicio} – {period.fim}
                          </span>
                        </div>
                        <span className="text-xs font-medium italic">
                          Horário vago / Sem aula cadastrada
                        </span>
                      </div>
                    );
                  }

                  // Período com aula(s)
                  return matchingSchedules.map((item) => {
                    const isDouble =
                      (item.duracao && item.duracao > 1) ||
                      item.horario_inicio < period.inicio ||
                      item.horario_fim > period.fim;

                    const isPart1 = item.horario_inicio === period.inicio;
                    const isPart2 = item.horario_fim === period.fim;

                    return (
                      <Card
                        key={`${period.id}-${item.id}`}
                        className={`p-3.5 space-y-2 border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition-all ${
                          item.grupo === "A"
                            ? "border-l-4 border-l-[#2d3661]"
                            : item.grupo === "B"
                            ? "border-l-4 border-l-[#4aaa3c]"
                            : isDouble
                            ? "border-l-4 border-l-[#2d3661] dark:border-l-[#7de06f]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#2d3661]/30 border border-[#2d3661]/20 dark:border-[#2d3661]/40 px-2 py-0.5 rounded-md">
                              {period.nome}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1 text-[#4aaa3c] dark:text-[#7de06f]" />
                              {period.inicio} – {period.fim}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {item.grupo === "A" && (
                              <span className="text-[10px] font-bold bg-[#2d3661]/10 dark:bg-[#2d3661]/30 text-[#2d3661] dark:text-slate-100 border border-[#2d3661]/25 dark:border-[#2d3661]/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2d3661]" />
                                <span>[A] Grupo A</span>
                              </span>
                            )}
                            {item.grupo === "B" && (
                              <span className="text-[10px] font-bold bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/25 text-[#4aaa3c] dark:text-[#7de06f] border border-[#4aaa3c]/25 dark:border-[#4aaa3c]/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4aaa3c]" />
                                <span>[B] Grupo B</span>
                              </span>
                            )}
                            {isDouble && (
                              <span
                                className="text-[10px] font-bold bg-[#2d3661]/10 dark:bg-[#7de06f]/20 text-[#2d3661] dark:text-[#7de06f] px-2 py-0.5 rounded-md border border-[#2d3661]/20 dark:border-[#7de06f]/30"
                                title={
                                  isPart1
                                    ? "Aula dupla (1ª parte)"
                                    : isPart2
                                    ? "Aula dupla (2ª parte)"
                                    : "Aula dupla"
                                }
                              >
                                {isPart1 ? "Dupla (1/2)" : isPart2 ? "Dupla (2/2)" : "Dupla"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {item.disciplina}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center font-medium">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                              <span>{item.professor}</span>
                            </p>
                            {item.sala && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center">
                                <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                                {item.sala}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  });
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

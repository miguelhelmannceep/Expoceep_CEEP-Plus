import React, { useState, useEffect, useRef } from "react";
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
  Check,
  Coffee,
  MapPin,
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

export const SchedulesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("Segunda-feira");
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const daysOfWeek = [
    { full: "Segunda-feira", short: "Seg" },
    { full: "Terça-feira", short: "Ter" },
    { full: "Quarta-feira", short: "Qua" },
    { full: "Quinta-feira", short: "Qui" },
    { full: "Sexta-feira", short: "Sex" },
  ];

  useEffect(() => {
    scheduleService
      .getClasses()
      .then((data) => {
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingClasses(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    setIsLoadingSchedules(true);
    scheduleService
      .getSchedulesByClass(selectedClassId)
      .then(setSchedules)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingSchedules(false));
  }, [selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const isTarde = selectedClass?.periodo?.toLowerCase().includes("tarde") || false;
  const currentPeriods = isTarde ? PERIODS_TARDE : PERIODS_MANHA;

  const filteredSchedules = schedules.filter(
    (item) => item.dia_semana.toLowerCase() === selectedDay.toLowerCase()
  );

  const checkOverlap = (item: ScheduleItem, period: PeriodSlot) => {
    return item.horario_inicio < period.fim && item.horario_fim > period.inicio;
  };

  const filledPeriodsCount = currentPeriods.filter(
    (p) => !p.is_intervalo && filteredSchedules.some((s) => checkOverlap(s, p))
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
          Consulte os horários e disciplinas da sua turma ou de outras turmas.
        </p>
      </div>

      {/* Seletor Institucional de Turma */}
      <div className="space-y-1.5" ref={dropdownRef}>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Turma Selecionada
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            className="w-full min-h-[48px] px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#2d3661] dark:hover:border-[#4aaa3c] focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/10 rounded-2xl flex items-center justify-between shadow-sm transition-all text-left"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#2d3661]/10 dark:bg-[#2d3661]/30 text-[#2d3661] dark:text-[#7de06f] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedClass ? selectedClass.nome_turma : "Selecione uma turma"}
                </span>
                {selectedClass && (
                  <span className="block text-[11px] font-medium text-[#4aaa3c] dark:text-[#7de06f]">
                    Período: {selectedClass.periodo}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-[#2d3661] dark:text-[#7de06f]" : ""
              }`}
            />
          </button>

          {/* Menu Suspenso de Seleção de Turma */}
          {isDropdownOpen && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in duration-100 max-h-60 overflow-y-auto">
              {classes.map((c) => {
                const isSelected = c.id === selectedClassId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                      isSelected
                        ? "bg-[#2d3661]/10 dark:bg-[#4aaa3c]/20 text-[#2d3661] dark:text-[#7de06f] font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                    }`}
                  >
                    <div>
                      <span className="text-xs block font-bold text-slate-900 dark:text-slate-100">
                        {c.nome_turma}
                      </span>
                      <span className="text-[11px] block text-slate-500 dark:text-slate-400">
                        {c.periodo}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#4aaa3c] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
                    className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl flex items-center justify-between transition-colors shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                            Intervalo / Recreio
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400 font-medium">
                          Pausa pedagógica para lanche e descanso
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg">
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
                      isDouble
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
                          {isPart1 ? "Aula Dupla (1/2)" : isPart2 ? "Aula Dupla (2/2)" : "Aula Dupla"}
                        </span>
                      )}
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
    </div>
  );
};



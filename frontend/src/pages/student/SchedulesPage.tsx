import React, { useState, useEffect, useRef } from "react";
import { scheduleService } from "../../services/schedule.service";
import type { ClassOption, ScheduleItem } from "../../types";
import { Card } from "../../components/common/Card";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Calendar, Clock, User as UserIcon, BookOpen, GraduationCap, ChevronDown, Check } from "lucide-react";

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

  const filteredSchedules = schedules.filter(
    (item) => item.dia_semana.toLowerCase() === selectedDay.toLowerCase()
  );

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
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-[#2d3661]" />
          <span>Quadro de Horários</span>
        </h2>
        <p className="text-xs text-slate-500">
          Consulte os horários e disciplinas da sua turma ou de outras turmas.
        </p>
      </div>

      {/* Seletor Institucional de Turma */}
      <div className="space-y-1.5" ref={dropdownRef}>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Turma Selecionada
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-slate-200 hover:border-[#2d3661] focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/10 rounded-2xl flex items-center justify-between shadow-sm transition-all text-left"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#2d3661]/10 text-[#2d3661] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 truncate">
                  {selectedClass ? selectedClass.nome_turma : "Selecione uma turma"}
                </span>
                {selectedClass && (
                  <span className="block text-[11px] font-medium text-[#4aaa3c]">
                    Período: {selectedClass.periodo}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-[#2d3661]" : ""
              }`}
            />
          </button>

          {/* Menu Suspenso de Seleção de Turma */}
          {isDropdownOpen && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in duration-100 max-h-60 overflow-y-auto">
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
                        ? "bg-[#2d3661]/10 text-[#2d3661] font-bold"
                        : "hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div>
                      <span className="text-xs block font-bold text-slate-900">
                        {c.nome_turma}
                      </span>
                      <span className="text-[11px] block text-slate-500">
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
                  ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{day.short}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de Aulas do Dia */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-800">{selectedDay}</span>
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredSchedules.length} {filteredSchedules.length === 1 ? "aula programada" : "aulas programadas"}
          </span>
        </div>

        {isLoadingSchedules ? (
          <ListSkeleton count={4} />
        ) : filteredSchedules.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sem aulas cadastradas"
            description="Nenhuma disciplina cadastrada para este dia nesta turma."
          />
        ) : (
          filteredSchedules.map((item) => (
            <Card key={item.id} className="p-3.5 space-y-2 border-slate-100 hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2d3661] bg-[#2d3661]/10 border border-[#2d3661]/20 px-2 py-0.5 rounded-md flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-[#4aaa3c]" />
                  {item.horario_inicio} - {item.horario_fim}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.disciplina}</h3>
                <p className="text-xs text-slate-600 flex items-center mt-0.5 font-medium">
                  <UserIcon className="w-3 h-3 text-slate-400 mr-1" />
                  {item.professor}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};


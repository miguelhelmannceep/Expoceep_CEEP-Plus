import React, { useState, useEffect } from "react";
import { scheduleService } from "../../services/schedule.service";
import type { ClassOption, ScheduleItem } from "../../types";
import { Card } from "../../components/common/Card";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Calendar, Clock, User as UserIcon, BookOpen } from "lucide-react";


export const SchedulesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
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
    if (!selectedClassId) return;
    setIsLoadingSchedules(true);
    scheduleService
      .getSchedulesByClass(selectedClassId)
      .then(setSchedules)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingSchedules(false));
  }, [selectedClassId]);

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
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span>Quadro de Horários</span>
        </h2>
        <p className="text-xs text-slate-500">
          Consulte os horários e disciplinas de qualquer turma disponível.
        </p>
      </div>

      {/* Seletor de Turma */}
      <div className="space-y-1.5">
        <label htmlFor="turma-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Turma
        </label>
        <select
          id="turma-select"
          value={selectedClassId || ""}
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_turma} — {c.periodo}
            </option>
          ))}
        </select>
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
              className={`flex-1 min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-700/20"
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
          <span className="text-xs font-bold text-slate-700">{selectedDay}</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {filteredSchedules.length} aulas programadas
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
            <Card key={item.id} className="p-3.5 space-y-2 border-slate-100 hover:border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-emerald-600" />
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

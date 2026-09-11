import React, { useEffect, useState } from "react";
import { studentService } from "../../services/student.service";
import type { StudentDashboard } from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { DashboardSkeleton } from "../../components/common/Skeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import type { StudentTab } from "../../components/layout/StudentLayout";
import { Clock, Bell, CheckSquare, Coffee, ChevronRight, BookOpen, User as UserIcon } from "lucide-react";


interface DashboardPageProps {
  onNavigate: (tab: StudentTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    studentService
      .getDashboard()
      .then(setDashboard)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !dashboard) {
    return <ErrorMessage message={error || "Erro ao carregar seu painel."} onRetry={loadData} />;
  }

  const getNoticeBadge = (prioridade: string) => {
    switch (prioridade) {
      case "URGENTE":
        return <Badge variant="danger">URGENTE</Badge>;
      case "ALTA":
        return <Badge variant="warning">ALTA</Badge>;
      case "MEDIA":
        return <Badge variant="info">MÉDIA</Badge>;
      default:
        return <Badge variant="neutral">GERAL</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Saudação e Contexto da Turma */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-sm space-y-1.5 border border-slate-800">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
          <span>{dashboard.saudacao},</span>
        </p>
        <h2 className="text-xl font-bold tracking-tight text-white">{dashboard.aluno_nome}</h2>
        <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
          <span className="bg-slate-800/90 text-emerald-300 border border-slate-700 px-2.5 py-0.5 rounded-lg font-medium">
            {dashboard.turma_nome}
          </span>
        </div>
      </div>

      {/* Próxima Aula */}
      {dashboard.proxima_aula ? (
        <Card className="border-emerald-100 bg-emerald-50/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Próxima Aula</span>
            </span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {dashboard.proxima_aula.horario_inicio} - {dashboard.proxima_aula.horario_fim}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {dashboard.proxima_aula.disciplina}
            </h3>
            <p className="text-xs text-slate-600 flex items-center mt-0.5">
              <UserIcon className="w-3 h-3 mr-1 text-slate-400" />
              {dashboard.proxima_aula.professor}
            </p>
          </div>
        </Card>

      ) : null}

      {/* Aviso Destaque */}
      {dashboard.aviso_recente ? (
        <Card
          onClick={() => onNavigate("avisos")}
          className="p-4 space-y-2 border-l-4 border-l-amber-500 hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Comunicado Recente</span>
            </span>
            {getNoticeBadge(dashboard.aviso_recente.prioridade)}
          </div>
          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
            {dashboard.aviso_recente.titulo}
          </h4>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {dashboard.aviso_recente.descricao}
          </p>
          <div className="flex items-center justify-end text-xs font-semibold text-emerald-600 pt-1">
            <span>Ver mural completo</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </Card>
      ) : null}

      {/* Grid Resumo: Tarefas & Cantina */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bloco Tarefas */}
        <Card
          onClick={() => onNavigate("tarefas")}
          className="p-4 space-y-2 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Tarefas Pendentes</p>
            <p className="text-2xl font-black text-slate-900">
              {dashboard.tarefas_pendentes_count}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 flex items-center pt-1">
            Minhas tarefas <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </Card>

        {/* Bloco Cantina */}
        <Card
          onClick={() => onNavigate("cantina")}
          className="p-4 space-y-2 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Cantina Escolar</p>
            <p className="text-base font-bold text-slate-900">
              {dashboard.cantina_destaque
                ? `R$ ${dashboard.cantina_destaque.preco.toFixed(2).replace(".", ",")}`
                : "Salgado"}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 flex items-center pt-1">
            Ficha digital <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </Card>
      </div>

      {/* Atalho Horários da Turma */}
      <Card
        onClick={() => onNavigate("horarios")}
        className="p-4 flex items-center justify-between bg-slate-900 text-white hover:bg-slate-850 transition-all cursor-pointer border border-slate-800"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Quadro de Horários</p>
            <p className="text-[11px] text-slate-400">Consulte a grade semanal de aulas</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </Card>
    </div>
  );
};

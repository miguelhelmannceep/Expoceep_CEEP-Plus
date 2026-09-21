import React, { useEffect, useState } from "react";
import { studentService } from "../../services/student.service";
import type { StudentDashboard } from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { DashboardSkeleton } from "../../components/common/Skeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import type { StudentTab } from "../../components/layout/StudentLayout";
import { Clock, Bell, CheckSquare, Coffee, ChevronRight, BookOpen, User as UserIcon, Quote } from "lucide-react";
import { getDailyQuote } from "../../utils/quotes";


interface DashboardPageProps {
  onNavigate: (tab: StudentTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dailyQuote = getDailyQuote();

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
      {/* Saudação, Turma e Frase do Dia Integrada */}
      <div className="bg-[#2d3661] dark:bg-[#1a203a] text-white rounded-3xl p-5 shadow-sm space-y-3 border border-[#232b4e] dark:border-slate-800 transition-colors">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#4aaa3c] dark:text-[#7de06f] uppercase tracking-wider flex items-center space-x-1">
            <span>{dashboard.saudacao},</span>
          </p>
          <h2 className="text-xl font-bold tracking-tight text-white">{dashboard.aluno_nome}</h2>
          <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
            <span className="bg-[#1f2647] dark:bg-slate-800 text-[#7de06f] border border-[#3c4779] dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-medium">
              {dashboard.turma_nome}
            </span>
          </div>
        </div>

        {/* Frase do Dia */}
        <div className="pt-2.5 border-t border-[#3c4779]/70 dark:border-slate-700/60">
          <div className="flex items-start space-x-2 text-xs text-slate-200 dark:text-slate-300">
            <Quote className="w-3.5 h-3.5 text-[#4aaa3c] dark:text-[#7de06f] shrink-0 mt-0.5" />
            <p className="italic font-medium text-slate-200 dark:text-slate-300 leading-snug">
              &ldquo;{dailyQuote}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Próxima Aula */}
      {dashboard.proxima_aula ? (
        <Card className="border-[#4aaa3c]/20 bg-[#4aaa3c]/5 dark:bg-[#4aaa3c]/10 dark:border-[#4aaa3c]/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4aaa3c] dark:text-[#7de06f]" />
              <span>Próxima Aula</span>
            </span>
            <span className="text-xs font-bold bg-[#4aaa3c]/15 text-[#2d3661] dark:text-[#7de06f] px-2.5 py-0.5 rounded-full border border-[#4aaa3c]/30">
              {dashboard.proxima_aula.horario_inicio} - {dashboard.proxima_aula.horario_fim}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {dashboard.proxima_aula.disciplina}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center mt-0.5">
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
          className="p-4 space-y-2 border-l-4 border-l-[#2d3661] dark:border-l-[#4aaa3c] hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>Comunicado Recente</span>
            </span>
            {getNoticeBadge(dashboard.aviso_recente.prioridade)}
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
            {dashboard.aviso_recente.titulo}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {dashboard.aviso_recente.descricao}
          </p>
          <div className="flex items-center justify-end text-xs font-semibold text-[#4aaa3c] dark:text-[#7de06f] pt-1">
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
          className="p-4 space-y-2 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-[#2d3661]/10 dark:bg-indigo-500/20 text-[#2d3661] dark:text-indigo-300 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tarefas Pendentes</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {dashboard.tarefas_pendentes_count}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#2d3661] dark:text-indigo-300 flex items-center pt-1">
            Minhas tarefas <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </Card>

        {/* Bloco Cantina */}
        <Card
          onClick={() => onNavigate("cantina")}
          className="p-4 space-y-2 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 text-[#4aaa3c] dark:text-[#7de06f] flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cantina Escolar</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {dashboard.cantina_destaque
                ? `R$ ${dashboard.cantina_destaque.preco.toFixed(2).replace(".", ",")}`
                : "Salgado"}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#4aaa3c] dark:text-[#7de06f] flex items-center pt-1">
            Ficha digital <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </Card>
      </div>

      {/* Atalho Horários da Turma */}
      <Card
        onClick={() => onNavigate("horarios")}
        className="p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#2d3661]/10 dark:bg-[#2d3661]/30 text-[#2d3661] dark:text-[#7de06f] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Quadro de Horários</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Consulte a grade semanal de aulas</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
      </Card>
    </div>
  );
};


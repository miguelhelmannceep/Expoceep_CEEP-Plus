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
              {dashboard.turma_nome ? dashboard.turma_nome : "Sem turma definida"}
            </span>
            {dashboard.curso_nome && (
              <span className="bg-[#1f2647]/60 dark:bg-slate-800/60 text-slate-300 border border-[#3c4779]/60 dark:border-slate-700/60 px-2 py-0.5 rounded-lg text-[11px]">
                {dashboard.curso_nome}
              </span>
            )}
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

      {/* Alerta Convidando para Seleção de Curso e Turma no Perfil */}
      {!dashboard.turma_nome && (
        <Card className="p-4 border-[#2d3661]/20 dark:border-[#7de06f]/30 bg-gradient-to-r from-[#2d3661]/5 to-[#4aaa3c]/5 dark:from-[#2d3661]/20 dark:to-[#4aaa3c]/10 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#2d3661]/10 dark:bg-[#7de06f]/20 text-[#2d3661] dark:text-[#7de06f] shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Defina seu Curso e Turma
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Você ainda não possui uma turma vinculada. Escolha seu curso e turma no Perfil para visualizar sua grade horária e próximas aulas.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("perfil")}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#2d3661] hover:bg-[#222a4d] dark:bg-[#4aaa3c] dark:hover:bg-[#3d9131] text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <span>Configurar no Perfil</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      )}

      {/* Aula Atual (Em Andamento) */}
      {dashboard.aula_atual && (
        <Card className="border-[#4aaa3c]/40 bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/15 dark:border-[#4aaa3c]/50 p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] uppercase tracking-wider flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4aaa3c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4aaa3c]"></span>
              </span>
              <span>Aula Atual</span>
            </span>
            <span className="text-xs font-bold bg-[#4aaa3c] text-white dark:text-slate-900 px-2.5 py-0.5 rounded-full shadow-xs">
              {dashboard.aula_atual.horario_inicio} - {dashboard.aula_atual.horario_fim}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {dashboard.aula_atual.disciplina}
            </h3>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="flex items-center">
                <UserIcon className="w-3 h-3 mr-1 text-slate-400" />
                {dashboard.aula_atual.professor}
              </span>
              {dashboard.aula_atual.sala && (
                <span className="text-slate-500 font-medium">Sala: {dashboard.aula_atual.sala}</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Próxima Aula */}
      {dashboard.proxima_aula && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2d3661] dark:text-[#7de06f]" />
              <span>
                Próxima Aula
                {dashboard.proxima_aula.dia_semana && dashboard.proxima_aula.dia_semana !== dashboard.dia_semana_atual
                  ? ` (${dashboard.proxima_aula.dia_semana})`
                  : ""}
              </span>
            </span>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
              {dashboard.proxima_aula.horario_inicio} - {dashboard.proxima_aula.horario_fim}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {dashboard.proxima_aula.disciplina}
            </h3>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="flex items-center">
                <UserIcon className="w-3 h-3 mr-1 text-slate-400" />
                {dashboard.proxima_aula.professor}
              </span>
              {dashboard.proxima_aula.sala && (
                <span className="text-slate-500 font-medium">Sala: {dashboard.proxima_aula.sala}</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Aulas de Hoje Concluídas (sem aulas adicionais) */}
      {dashboard.turma_nome && !dashboard.aula_atual && !dashboard.proxima_aula && (
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 space-y-1.5 text-center py-5">
          <Clock className="w-5 h-5 mx-auto text-slate-400" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {dashboard.mensagem_aulas || "Aulas de hoje concluídas"}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Consulte a grade completa na aba Horários.
          </p>
        </Card>
      )}

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


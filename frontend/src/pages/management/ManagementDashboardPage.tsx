import React, { useState, useEffect } from "react";
import { managementService } from "../../services/management.service";
import type { ManagementOverview } from "../../types";
import type { ManagementTab } from "../../components/layout/ManagementLayout";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  Users,
  Bell,
  Coffee,
  Layers,
  ShieldCheck,
  Activity,
  ShoppingBag,
  Clock,
  CheckCircle2,
  PackageCheck,
  DollarSign,
  ChevronRight,
  Calendar,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { ManagementNoticesPage } from "./ManagementNoticesPage";
import { ManagementCoursesClassesPage } from "./ManagementCoursesClassesPage";
import { ManagementDisciplinesProfessorsPage } from "./ManagementDisciplinesProfessorsPage";
import { ManagementSchedulesPage } from "./ManagementSchedulesPage";
import { ManagementCanteenPage } from "./ManagementCanteenPage";

interface ManagementDashboardPageProps {

  activeTab: ManagementTab;
  onTabChange?: (tab: ManagementTab) => void;
}

export const ManagementDashboardPage: React.FC<ManagementDashboardPageProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [overview, setOverview] = useState<ManagementOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    managementService
      .getOverview()
      .then(setOverview)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Carregando dados da gestão escolar..." />;
  }

  if (error || !overview) {
    return <ErrorMessage message={error || "Erro ao carregar métricas"} onRetry={loadData} />;
  }

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

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
    <div className="space-y-6">
      {/* ABA 1: DASHBOARD PRINCIPAL DA GESTÃO */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Cabeçalho do Painel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] bg-[#2d3661]/10 dark:bg-[#7de06f]/10 border border-[#2d3661]/20 dark:border-[#7de06f]/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Gestão Escolar
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">| CEEP Pedro Boaretto Neto</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                Olá, {overview.gestor}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Painel de monitoramento administrativo e indicadores da escola.
              </p>
            </div>

            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#4aaa3c] bg-[#4aaa3c]/10 px-3.5 py-2 rounded-xl border border-[#4aaa3c]/30 self-start sm:self-auto">
              <Activity className="w-4 h-4 text-[#4aaa3c]" />
              <span>Sistema {overview.status_sistema}</span>
            </div>
          </div>

          {/* Grid de 4 Indicadores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Alunos */}
            <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Alunos</span>
                <div className="p-2 rounded-xl bg-[#4aaa3c]/10 text-[#4aaa3c]">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{overview.total_alunos}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Estudantes cadastrados no sistema</p>
            </Card>

            {/* Turmas Ativas */}
            <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Turmas Ativas</span>
                <div className="p-2 rounded-xl bg-[#2d3661]/10 dark:bg-[#7de06f]/10 text-[#2d3661] dark:text-[#7de06f]">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{overview.total_turmas}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Cursos Técnicos Integrados</p>
            </Card>

            {/* Avisos Publicados */}
            <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avisos no Mural</span>
                <div className="p-2 rounded-xl bg-[#2d3661]/10 dark:bg-[#7de06f]/10 text-[#2d3661] dark:text-[#7de06f]">
                  <Bell className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{overview.total_avisos}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Comunicados escolares ativos</p>
            </Card>

            {/* Pedidos na Cantina */}
            <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Cantina</span>
                <div className="p-2 rounded-xl bg-[#4aaa3c]/10 text-[#4aaa3c]">
                  <Coffee className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{overview.cantina_resumo.total_pedidos}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Fichas geradas no aplicativo</p>
            </Card>
          </div>

          {/* SEÇÃO: RESUMO OPERACIONAL DA CANTINA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Resumo Operacional da Cantina
                </h3>
              </div>
              {onTabChange && (
                <button
                  onClick={() => onTabChange("cantina")}
                  className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] hover:text-[#4aaa3c] flex items-center space-x-1 transition-colors"
                >
                  <span>Gerenciar cantina</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Pedidos Realizados */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Realizados</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{overview.cantina_resumo.total_pedidos}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Total acumulado</p>
              </div>

              {/* Aguardando Pagamento */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pendentes</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{overview.cantina_resumo.pedidos_pendentes}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Aguardando PIX</p>
              </div>

              {/* Pagos / Prontos para Retirada */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs text-[#4aaa3c] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4aaa3c]" />
                  <span>Pagos / Balcão</span>
                </div>
                <p className="text-xl font-bold text-[#4aaa3c]">{overview.cantina_resumo.pedidos_pagos}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Disponíveis para retirada</p>
              </div>

              {/* Retiradas Concluídas */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <PackageCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Retirados</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{overview.cantina_resumo.pedidos_utilizados}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Entregues com QR</p>
              </div>

              {/* Faturamento Confirmado */}
              <div className="bg-[#2d3661] dark:bg-[#1a203a] text-white rounded-2xl p-4 shadow-sm space-y-1 col-span-2 sm:col-span-2 lg:col-span-1 border border-[#232b4e] dark:border-slate-800">
                <div className="flex items-center space-x-1.5 text-xs text-[#7de06f] font-semibold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Receita</span>
                </div>
                <p className="text-lg font-black text-white">
                  {formatCurrency(overview.cantina_resumo.receita_confirmada)}
                </p>
                <p className="text-[10px] text-slate-300 dark:text-slate-400">Faturamento confirmado</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO: AVISOS RECENTES DA ESCOLA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#2d3661] dark:text-[#7de06f]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Comunicados Recentes
                </h3>
              </div>
              {onTabChange && (
                <button
                  onClick={() => onTabChange("avisos")}
                  className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] hover:text-[#4aaa3c] flex items-center space-x-1 transition-colors"
                >
                  <span>Gerenciar avisos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {overview.avisos_recentes.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                Nenhum comunicado publicado no momento.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overview.avisos_recentes.map((aviso) => (
                  <Card key={aviso.id} className="p-4 space-y-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Público: {aviso.publico_alvo_tipo}
                      </span>
                      {getNoticeBadge(aviso.prioridade)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{aviso.titulo}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                        {aviso.descricao}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>Publicado por {aviso.autor_nome || "Gestão"}</span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400 dark:text-slate-500" />
                        {new Date(aviso.data_publicacao).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Card Informativo Institucional */}
          <Card className="p-5 bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center space-x-2.5 text-[#4aaa3c]">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="text-sm font-bold">Painel de Demonstração — ExpoCEEP 2026</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Métricas e indicadores alimentados dinamicamente com base nas interações dos alunos e atendentes no CEEP+. O módulo completo de edição de comunicados e gestão da grade horária será disponibilizado nos próximos milestones.
            </p>
          </Card>
        </div>
      )}

      {/* ABA DE GERENCIAMENTO DE AVISOS */}
      {activeTab === "avisos" && <ManagementNoticesPage />}

      {/* ABA DE GERENCIAMENTO DE CURSOS E TURMAS */}
      {activeTab === "turmas" && <ManagementCoursesClassesPage />}

      {/* ABA DE GERENCIAMENTO DE DISCIPLINAS E PROFESSORES */}
      {activeTab === "disciplinas" && <ManagementDisciplinesProfessorsPage />}

      {/* ABA DE GERENCIAMENTO DA GRADE HORÁRIA */}
      {activeTab === "horarios" && <ManagementSchedulesPage />}

      {/* ABA DE GESTÃO DA CANTINA */}
      {activeTab === "cantina" && <ManagementCanteenPage />}

      {activeTab === "configuracoes" && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Card Modo de Aparência */}
          <Card className="p-6 space-y-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Modo de Aparência da Gestão
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize a interface entre o modo claro e o modo escuro institucional.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Opção Claro */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  theme === "light"
                    ? "border-[#2d3661] bg-[#2d3661]/5 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${theme === "light" ? "bg-[#2d3661] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                      Claro
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                      Padrão diurno
                    </span>
                  </div>
                </div>
                {theme === "light" && (
                  <Check className="w-4 h-4 text-[#2d3661] shrink-0" />
                )}
              </button>

              {/* Opção Escuro */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  theme === "dark"
                    ? "border-[#4aaa3c] bg-[#4aaa3c]/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-[#4aaa3c] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                      Escuro
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                      Alto contraste noturno
                    </span>
                  </div>
                </div>
                {theme === "dark" && (
                  <Check className="w-4 h-4 text-[#4aaa3c] shrink-0" />
                )}
              </button>
            </div>
          </Card>

          {/* Card Configurações Institucionais */}
          <Card className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors">
            <ShieldCheck className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Configurações Institucionais</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Configurações gerais do sistema, parâmetros de segurança e níveis de permissão da gestão escolar.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

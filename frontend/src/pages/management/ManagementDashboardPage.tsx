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
  Calendar
} from "lucide-react";
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Gestão Escolar
                </span>
                <span className="text-xs text-slate-400 font-medium">| CEEP Pedro Boaretto Neto</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Olá, {overview.gestor}
              </h2>
              <p className="text-xs text-slate-500">
                Painel de monitoramento administrativo e indicadores da escola.
              </p>
            </div>

            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/80 self-start sm:self-auto">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Sistema {overview.status_sistema}</span>
            </div>
          </div>

          {/* Grid de 4 Indicadores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Alunos */}
            <Card className="p-5 space-y-2 border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Alunos</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_alunos}</p>
              <p className="text-[11px] text-slate-400 font-medium">Estudantes cadastrados no sistema</p>
            </Card>

            {/* Turmas Ativas */}
            <Card className="p-5 space-y-2 border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turmas Ativas</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_turmas}</p>
              <p className="text-[11px] text-slate-400 font-medium">Cursos Técnicos Integrados</p>
            </Card>

            {/* Avisos Publicados */}
            <Card className="p-5 space-y-2 border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avisos no Mural</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_avisos}</p>
              <p className="text-[11px] text-slate-400 font-medium">Comunicados escolares ativos</p>
            </Card>

            {/* Pedidos na Cantina */}
            <Card className="p-5 space-y-2 border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pedidos Cantina</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Coffee className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.cantina_resumo.total_pedidos}</p>
              <p className="text-[11px] text-slate-400 font-medium">Fichas geradas no aplicativo</p>
            </Card>
          </div>

          {/* SEÇÃO: RESUMO OPERACIONAL DA CANTINA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Resumo Operacional da Cantina
                </h3>
              </div>
              {onTabChange && (
                <button
                  onClick={() => onTabChange("cantina")}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1 transition-colors"
                >
                  <span>Gerenciar cantina</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Pedidos Realizados */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Realizados</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{overview.cantina_resumo.total_pedidos}</p>
                <p className="text-[10px] text-slate-400">Total acumulado</p>
              </div>

              {/* Aguardando Pagamento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pendentes</span>
                </div>
                <p className="text-xl font-bold text-amber-600">{overview.cantina_resumo.pedidos_pendentes}</p>
                <p className="text-[10px] text-slate-400">Aguardando PIX</p>
              </div>

              {/* Pagos / Prontos para Retirada */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pagos / Balcão</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">{overview.cantina_resumo.pedidos_pagos}</p>
                <p className="text-[10px] text-slate-400">Disponíveis para retirada</p>
              </div>

              {/* Retiradas Concluídas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                  <PackageCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Retirados</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{overview.cantina_resumo.pedidos_utilizados}</p>
                <p className="text-[10px] text-slate-400">Entregues com QR</p>
              </div>

              {/* Faturamento Confirmado */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm space-y-1 col-span-2 sm:col-span-2 lg:col-span-1 border border-slate-800">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Receita</span>
                </div>
                <p className="text-lg font-black text-emerald-400">
                  {formatCurrency(overview.cantina_resumo.receita_confirmada)}
                </p>
                <p className="text-[10px] text-slate-400">Faturamento confirmado</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO: AVISOS RECENTES DA ESCOLA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Comunicados Recentes
                </h3>
              </div>
              {onTabChange && (
                <button
                  onClick={() => onTabChange("avisos")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors"
                >
                  <span>Gerenciar avisos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {overview.avisos_recentes.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-500">
                Nenhum comunicado publicado no momento.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overview.avisos_recentes.map((aviso) => (
                  <Card key={aviso.id} className="p-4 space-y-2 border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Público: {aviso.publico_alvo_tipo}
                      </span>
                      {getNoticeBadge(aviso.prioridade)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{aviso.titulo}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                        {aviso.descricao}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Publicado por {aviso.autor_nome || "Gestão"}</span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
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
            <div className="flex items-center space-x-2.5 text-blue-400">
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
        <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Configurações Institucionais</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Configurações gerais do sistema, parâmetros de segurança e níveis de permissão.
          </p>
        </Card>
      )}
    </div>
  );
};

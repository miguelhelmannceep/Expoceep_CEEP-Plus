import React, { useState, useEffect } from "react";
import { managementService } from "../../services/management.service";
import type { ManagementOverview } from "../../types";
import type { ManagementTab } from "../../components/layout/ManagementLayout";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Users, Bell, Coffee, BookOpen, Layers, ShieldCheck, Activity } from "lucide-react";

interface ManagementDashboardPageProps {
  activeTab: ManagementTab;
}

export const ManagementDashboardPage: React.FC<ManagementDashboardPageProps> = ({
  activeTab,
}) => {
  const [overview, setOverview] = useState<ManagementOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    managementService
      .getOverview()
      .then(setOverview)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Carregando dados da gestão..." />;
  }

  if (error || !overview) {
    return <ErrorMessage message={error || "Erro ao carregar métricas"} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Visão Geral da Instituição</h2>
              <p className="text-xs text-slate-500">Métricas consolidadas do sistema CEEP+</p>
            </div>
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Sistema Operacional ({overview.status_sistema})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 space-y-2 border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Turmas Ativas</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_turmas}</p>
              <p className="text-[11px] text-slate-400">Cursos Técnicos Integrados</p>
            </Card>

            <Card className="p-5 space-y-2 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Total de Alunos</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_alunos}</p>
              <p className="text-[11px] text-slate-400">Matrículas ativas registradas</p>
            </Card>

            <Card className="p-5 space-y-2 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Avisos Publicados</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{overview.total_avisos}</p>
              <p className="text-[11px] text-slate-400">Mural geral e específico</p>
            </Card>

            <Card className="p-5 space-y-2 border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Demanda Cantina</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Coffee className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {overview.demanda_estimada_cantina}
              </p>
              <p className="text-[11px] text-slate-400">Previsão estimada de consumo</p>
            </Card>
          </div>

          <Card className="p-6 bg-slate-900 text-white space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Painel da Gestão Escolar — Fase 2</h3>
                <p className="text-xs text-slate-400">
                  Ambiente administrativo inicial validado com controle de acesso RBAC.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
              As funcionalidades completas de administração de comunicados, edição da grade de horários e relatórios analíticos da cantina serão implementadas nos milestones subsequentes.
            </p>
          </Card>
        </div>
      )}

      {activeTab === "avisos" && (
        <Card className="p-8 text-center space-y-3">
          <Bell className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Gerenciador de Avisos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            O módulo completo para criação, edição, segmentação (Escola Toda, Curso, Turma) e exclusão de comunicados será implementado na fase dedicada de Avisos.
          </p>
        </Card>
      )}

      {activeTab === "turmas" && (
        <Card className="p-8 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-blue-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Administração de Turmas e Horários</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            A gestão de cursos, turmas, disciplinas, professores e alocação de horários receberá sua interface completa em etapa posterior.
          </p>
        </Card>
      )}

      {activeTab === "cantina" && (
        <Card className="p-8 text-center space-y-3">
          <Coffee className="w-10 h-10 text-indigo-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Relatórios de Demanda da Cantina</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Visualização de métricas de votos de consumo, volume de pedidos e histórico de faturamento simulado.
          </p>
        </Card>
      )}

      {activeTab === "configuracoes" && (
        <Card className="p-8 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Configurações do Sistema</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Configurações gerais do CEEP+, parâmetros institucionais e permissões de acesso.
          </p>
        </Card>
      )}
    </div>
  );
};

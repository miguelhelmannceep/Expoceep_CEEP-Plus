import React, { useState, useEffect } from "react";
import { canteenService } from "../../services/canteen.service";
import type { CanteenTerminalStatus } from "../../types";
import type { CanteenTab } from "../../components/layout/CanteenLayout";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { QrCode, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";

interface CanteenDashboardPageProps {
  activeTab: CanteenTab;
}

export const CanteenDashboardPage: React.FC<CanteenDashboardPageProps> = ({ activeTab }) => {
  const [terminalStatus, setTerminalStatus] = useState<CanteenTerminalStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    canteenService
      .getTerminalStatus()
      .then(setTerminalStatus)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Conectando terminal da cantina..." />;
  }

  if (error || !terminalStatus) {
    return <ErrorMessage message={error || "Erro ao conectar terminal"} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      {activeTab === "inicio" && (
        <div className="space-y-4">
          <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Status Operacional
              </span>
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{terminalStatus.status}</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold">{terminalStatus.terminal}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Operador autenticado: {terminalStatus.atendente}
              </p>
            </div>
          </Card>

          <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fluxo de Atendimento Rápido
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              O terminal da cantina foi projetado para operações de alta velocidade durante o intervalo escolar.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-amber-400">1. Aluno apresenta QR Code no smartphone</p>
              <p className="font-semibold text-amber-400">2. Leitor valida autenticidade e status</p>
              <p className="font-semibold text-amber-400">3. Confirmação imediata da entrega</p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "scanner" && (
        <Card className="bg-slate-950 border-slate-800 text-white p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Leitor de QR Code</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              {terminalStatus.mensagem}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Fase 2: Validação de estrutura e navegação funcional</span>
          </div>
        </Card>
      )}

      {activeTab === "pedidos" && (
        <Card className="bg-slate-950 border-slate-800 text-white p-8 text-center space-y-3">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold">Fila de Pedidos</h3>
          <p className="text-xs text-slate-400">
            A lista e histórico de retiradas serão integrados na fase do módulo da Cantina.
          </p>
        </Card>
      )}
    </div>
  );
};

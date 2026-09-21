import React from "react";
import { Button } from "../components/common/Button";
import { AlertTriangle } from "lucide-react";

export const NotFoundPage: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-200 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#2d3661]/10 text-[#2d3661] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Página Não Encontrada</h2>
          <p className="text-xs text-slate-500 mt-1">
            O endereço solicitado não existe ou foi movido.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onHome} className="w-full">
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

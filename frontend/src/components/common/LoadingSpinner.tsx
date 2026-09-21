import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = "Carregando informações...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-[#2d3661]" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
};

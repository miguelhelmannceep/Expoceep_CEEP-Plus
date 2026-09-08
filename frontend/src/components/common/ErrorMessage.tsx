import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
      <AlertCircle className="w-6 h-6 text-rose-600" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="bg-white">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
};

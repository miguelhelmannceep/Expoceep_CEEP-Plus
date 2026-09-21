import React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 text-center space-y-3 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

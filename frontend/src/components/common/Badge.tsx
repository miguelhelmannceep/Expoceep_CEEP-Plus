import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
}) => {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80 font-semibold",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80 font-semibold",
    info: "bg-sky-50 text-sky-700 border-sky-200/80 font-semibold",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-tight ${styles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

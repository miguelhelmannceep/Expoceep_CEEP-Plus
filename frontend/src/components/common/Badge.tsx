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
    success: "bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 text-[#4aaa3c] dark:text-[#7de06f] border-[#4aaa3c]/30 dark:border-[#4aaa3c]/40 font-semibold",
    warning: "bg-[#2d3661]/10 dark:bg-[#2d3661]/30 text-[#2d3661] dark:text-indigo-300 border-[#2d3661]/25 dark:border-indigo-500/30 font-semibold",
    danger: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 font-semibold",
    info: "bg-[#2d3661]/10 dark:bg-[#2d3661]/30 text-[#2d3661] dark:text-blue-300 border-[#2d3661]/20 dark:border-blue-500/30 font-semibold",
    neutral: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium",
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

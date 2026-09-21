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
    success: "bg-[#4aaa3c]/10 text-[#4aaa3c] border-[#4aaa3c]/30 font-semibold",
    warning: "bg-[#2d3661]/10 text-[#2d3661] border-[#2d3661]/25 font-semibold",
    danger: "bg-red-50 text-red-700 border-red-200 font-semibold",
    info: "bg-[#2d3661]/10 text-[#2d3661] border-[#2d3661]/20 font-semibold",
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

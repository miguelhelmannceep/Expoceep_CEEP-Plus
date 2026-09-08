import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-slate-200 hover:shadow-md active:scale-[0.99]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

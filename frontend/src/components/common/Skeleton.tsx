import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-slate-200/80 dark:bg-slate-700/60 rounded-xl ${className}`} />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Greeting banner skeleton */}
      <div className="bg-slate-900 rounded-3xl p-5 space-y-3 animate-pulse">
        <div className="w-24 h-4 bg-slate-700 rounded-md" />
        <div className="w-48 h-6 bg-slate-700 rounded-lg" />
        <div className="w-32 h-4 bg-slate-800 rounded-md" />
      </div>

      {/* Next class skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <Skeleton className="w-40 h-5" />
        <Skeleton className="w-32 h-3" />
        <div className="pt-2 border-t border-slate-50 dark:border-slate-700">
          <Skeleton className="w-24 h-3" />
        </div>
      </div>

      {/* Notice skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-full h-3" />
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-10 h-6" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-16 h-6" />
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-full h-3" />
        </div>
      ))}
    </div>
  );
};


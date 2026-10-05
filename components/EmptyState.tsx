"use client";
import type { ReactNode } from "react";
import { EmptyBook } from "./Illustrations";

interface EmptyStateProps {
  title: string;
  description?: string;
  art?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  art,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`card p-10 sm:p-14 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-28 mb-4">
        {art ?? <EmptyBook className="w-full text-ink" />}
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-subtle max-w-sm mt-1">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

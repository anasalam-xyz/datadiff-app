"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, KeyRound } from "lucide-react";
import { api, apiHeaders, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset, Version } from "@/app/api/types";

export default function DatasetCard({ dataset }: { dataset: Dataset }) {
  const versionsQuery = useQuery({
    queryKey: qk.versions(dataset.id),
    queryFn: async () =>
      unwrap<Version[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/versions", {
          params: { path: { dataset_id: dataset.id }, header: apiHeaders() },
        })
      ),
  });

  const versions = versionsQuery.data;
  const latestVersion = versions && versions.length > 0 ? versions[versions.length - 1] : null;

  const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card p-5.5 flex flex-col justify-between border border-transparent hover:border-line hover:shadow-float transition-all duration-200 group">
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-control bg-surface border border-line grid place-items-center text-ink font-extrabold text-sm shrink-0 group-hover:bg-ink group-hover:text-white transition-colors">
              {dataset.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link
                href={`/datasets/${dataset.id}/passport`}
                className="font-bold text-base text-ink hover:underline truncate block"
              >
                {dataset.name}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-mute mt-0.5">
                <Calendar size={12} />
                <span>{formattedDate}</span>
                {dataset.source && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{dataset.source}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-subtle line-clamp-2 min-h-[2.5rem]">
          {dataset.description || "No description provided."}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {dataset.primary_key.length > 0 ? (
            dataset.primary_key.map((k) => (
              <span key={k} className="chip font-mono text-[11px]">
                <KeyRound size={11} className="text-mute" />
                {k}
              </span>
            ))
          ) : (
            <span className="pill-warn text-[11px]">No primary key</span>
          )}

          {dataset.tags.map((t) => (
            <span key={t} className="chip text-subtle text-[11px]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-line/70 flex items-center justify-between text-xs">
        <div>
          {versionsQuery.isLoading ? (
            <div className="skeleton h-5 w-24" />
          ) : latestVersion ? (
            <div className="flex items-center gap-2 font-medium text-ink">
              <span className="chip num font-bold text-xs bg-card">
                v{latestVersion.version_no}
              </span>
              <span className="text-mute num">
                {latestVersion.row_count.toLocaleString()} rows
              </span>
            </div>
          ) : (
            <span className="text-mute italic">No versions yet</span>
          )}
        </div>

        <Link
          href={`/datasets/${dataset.id}/passport`}
          className="btn btn-ghost btn-sm text-xs font-semibold group-hover:bg-ink group-hover:text-white group-hover:border-ink transition-colors"
        >
          Passport <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

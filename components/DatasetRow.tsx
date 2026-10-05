"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, KeyRound } from "lucide-react";
import { api, apiHeaders, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset, Version } from "@/app/api/types";

export default function DatasetRow({ dataset }: { dataset: Dataset }) {
  const versionsQuery = useQuery({
    queryKey: qk.versions(dataset.id),
    queryFn: async () =>
      unwrap<Version[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/versions", {
          params: { path: { dataset_id: dataset.id }, header: apiHeaders },
        })
      ),
    enabled: !dataset.latest_version,
  });

  const latestVersion =
    dataset.latest_version ??
    (versionsQuery.data && versionsQuery.data.length > 0
      ? versionsQuery.data[versionsQuery.data.length - 1]
      : null);

  return (
    <div className="card-row p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-transparent hover:border-line transition-all duration-200 group">
      {/* Left: Icon Tile + Title + Subtitle & Chips */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="size-11 rounded-control bg-surface border border-line grid place-items-center font-extrabold text-ink text-sm shrink-0 group-hover:bg-ink group-hover:text-white transition-colors">
          {dataset.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/datasets/${dataset.id}/passport`}
              className="font-bold text-base text-ink hover:underline truncate"
            >
              {dataset.name}
            </Link>
          </div>

          <p className="text-xs text-subtle truncate max-w-lg">
            {dataset.description || dataset.source || "No description provided."}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {dataset.primary_key.length > 0 ? (
              <span className="chip font-mono text-[11px]">
                <KeyRound size={11} className="text-mute" />
                {dataset.primary_key.join(", ")}
              </span>
            ) : (
              <span className="pill-warn text-[11px]">No primary key</span>
            )}

            {dataset.tags.slice(0, 3).map((t) => (
              <span key={t} className="chip text-subtle text-[11px]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Version and Row count + Open Button */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
        <div className="text-right min-w-[100px]">
          {versionsQuery.isLoading ? (
            <div className="skeleton h-5 w-20 ml-auto" />
          ) : latestVersion ? (
            <div className="space-y-0.5">
              <span className="chip num font-bold text-xs bg-surface">
                v{latestVersion.version_no}
              </span>
              <div className="text-[11px] text-mute num">
                {latestVersion.row_count.toLocaleString()} rows
              </div>
            </div>
          ) : (
            <span className="text-xs text-mute italic">No versions</span>
          )}
        </div>

        <Link
          href={`/datasets/${dataset.id}/passport`}
          className="btn btn-solid btn-sm shrink-0 flex items-center gap-1.5"
        >
          <span>Open passport</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

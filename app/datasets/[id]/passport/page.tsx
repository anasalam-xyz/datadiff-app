"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Download,
  FileText,
  Filter,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { api, apiHeaders, errMsg, getActorHeaderName, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Entry, VerifyResult } from "@/app/api/types";
import { useIntegrity } from "@/components/IntegrityBadge";
import HashChip from "@/components/HashChip";
import ActorChip from "@/components/ActorChip";
import StatChip from "@/components/StatChip";
import { useToast } from "@/components/Toast";

function formatBytes(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

function PassportTimeline() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { setState: setIntegrity } = useIntegrity();

  const activeTypeFilter = searchParams.get("type") || "all";

  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyTimestamp, setVerifyTimestamp] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const verifyRequestHandled = useRef(false);

  // Track newly arrived entries for live update highlight
  const knownEntryIds = useRef<Set<number>>(new Set());
  const [recentEntryIds, setRecentEntryIds] = useState<Set<number>>(new Set());

  // Polling passport entries every 4 seconds
  const passportQuery = useQuery({
    queryKey: qk.passport(id, activeTypeFilter),
    queryFn: async () => {
      const typeParam = activeTypeFilter === "all" ? undefined : activeTypeFilter;
      return unwrap<Entry[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/passport", {
          params: {
            path: { dataset_id: id },
            header: apiHeaders(),
            query: { type: typeParam },
          },
        })
      );
    },
    refetchInterval: 4000,
  });

  const entries = passportQuery.data ?? [];

  // Detect new entries arriving live from Python SDK
  useEffect(() => {
    if (!passportQuery.data) return;
    const newIds = knownEntryIds.current.size === 0
      ? []
      : passportQuery.data
          .filter((entry) => !knownEntryIds.current.has(entry.id))
          .map((entry) => entry.id);
    knownEntryIds.current = new Set(passportQuery.data.map((e) => e.id));

    if (newIds.length > 0) {
      setRecentEntryIds(new Set(newIds));
      toast.info(`${newIds.length} new passport entry added`);
      const timer = setTimeout(() => setRecentEntryIds(new Set()), 3000);
      return () => clearTimeout(timer);
    }
  }, [passportQuery.data, toast]);

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      return unwrap<VerifyResult>(
        await api.POST("/api/v1/datasets/{dataset_id}/passport/verify", {
          params: { path: { dataset_id: id }, header: apiHeaders() },
        })
      );
    },
    onSuccess: (result) => {
      setVerifyResult(result);
      setVerifyTimestamp(new Date());
      setIntegrity(result.valid ? "valid" : "broken");
      if (result.valid) {
        toast.success("Passport cryptographic integrity verified!");
      } else {
        toast.error("Integrity check failed: tampering detected!");
      }
    },
    onError: (err) => {
      toast.error(errMsg(err));
    },
  });
  const { mutate: runVerify } = verifyMutation;

  useEffect(() => {
    if (searchParams.get("verify") !== "1") {
      verifyRequestHandled.current = false;
      return;
    }
    if (verifyRequestHandled.current) return;

    verifyRequestHandled.current = true;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("verify");
    const query = nextParams.toString();
    router.replace(`/datasets/${id}/passport${query ? `?${query}` : ""}`);
    runVerify();
  }, [id, router, searchParams, runVerify]);

  // Export JSON handler with API key header
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (!apiKey) {
        throw new Error("Set NEXT_PUBLIC_API_KEY in .env.local to export passports.");
      }

      const res = await fetch(`${baseUrl}/api/v1/datasets/${id}/passport/export`, {
        headers: {
          "X-API-Key": apiKey,
          "X-Actor": getActorHeaderName(),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status}): ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passport_${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded passport_${id}.json`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to export passport");
    } finally {
      setIsExporting(false);
    }
  };

  const setFilter = (type: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (type === "all") p.delete("type");
    else p.set("type", type);
    router.replace(`/datasets/${id}/passport?${p.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Navigation */}
        <div className="flex items-center gap-3">
          <Filter size={15} className="text-mute shrink-0" />
          <nav className="flex items-center gap-4">
            <button
              type="button"
              className="tab"
              data-active={activeTypeFilter === "all"}
              onClick={() => setFilter("all")}
            >
              All entries
            </button>
            <button
              type="button"
              className="tab"
              data-active={activeTypeFilter === "CREATED"}
              onClick={() => setFilter("CREATED")}
            >
              Created
            </button>
            <button
              type="button"
              className="tab"
              data-active={activeTypeFilter === "VERSION_ADDED"}
              onClick={() => setFilter("VERSION_ADDED")}
            >
              Versions
            </button>
            <button
              type="button"
              className="tab"
              data-active={activeTypeFilter === "TRANSFORMATION"}
              onClick={() => setFilter("TRANSFORMATION")}
            >
              Transformations
            </button>
          </nav>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            className="btn btn-solid btn-sm"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            <span>Verify integrity</span>
          </button>
        </div>
      </div>

      {/* Verify Result Panel */}
      {verifyResult && (
        <div className="transition-all duration-300">
          {verifyResult.valid ? (
            /* Green Valid Panel */
            <div className="rounded-card bg-ok-soft border border-ok/20 p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="size-10 rounded-control bg-ok text-white grid place-items-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-ok text-base">
                    Passport verified
                  </h4>
                  <p className="text-sm text-ok/90 mt-0.5 font-medium">
                    {verifyResult.entries_checked} entries checked, all stored files match.
                  </p>
                  <p className="text-xs text-ok/70 mt-1 font-mono">
                    Verified at {verifyTimestamp?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyResult(null)}
                className="text-ok hover:text-ink text-xs font-semibold px-2 py-1 rounded"
              >
                Dismiss
              </button>
            </div>
          ) : (
            /* Red Invalid Panel */
            <div className="rounded-card bg-bad-soft border border-bad/20 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-control bg-bad text-white grid place-items-center shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-bad text-base">
                      {verifyResult.first_broken_seq != null
                        ? verifyResult.reason?.toLowerCase().includes("gap") ||
                          verifyResult.reason?.toLowerCase().includes("delet")
                          ? `Chain broken at or before entry ${verifyResult.first_broken_seq}`
                          : `Chain broken at entry ${verifyResult.first_broken_seq}`
                        : "Stored file mismatch detected"}
                    </h4>
                    {verifyResult.reason && (
                      <p className="text-sm text-bad/95 font-medium mt-0.5">
                        {verifyResult.reason}
                      </p>
                    )}
                    <p className="text-xs text-bad/70 mt-1">
                      {verifyResult.entries_checked} entries checked before failure detected.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyResult(null)}
                  className="text-bad hover:text-ink text-xs font-semibold px-2 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>

              {/* Stored File Mismatches Section */}
              {verifyResult.file_mismatches?.length > 0 && (
                <div className="pt-3 border-t border-bad/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-bad">
                    File Mismatches ({verifyResult.file_mismatches.length})
                  </p>
                  <div className="space-y-2">
                    {verifyResult.file_mismatches.map((m) => (
                      <div
                        key={m.version_no}
                        className="bg-surface rounded-control p-3 border border-bad/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="font-semibold text-ink">
                          Version {m.version_no}: file was modified or missing
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-mute">Expected:</span>
                          <HashChip hash={m.expected} length={8} />
                          <span className="text-mute">Actual:</span>
                          {m.actual === "FILE MISSING" ? (
                            <span className="pill-bad text-[11px]">FILE MISSING</span>
                          ) : (
                            <HashChip hash={m.actual} length={8} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline Section */}
      {passportQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton size-8 rounded-control" />
                <div className="skeleton h-5 w-40" />
              </div>
              <div className="skeleton h-4 w-72" />
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      ) : passportQuery.isError ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-bad font-semibold text-sm">
            {errMsg(passportQuery.error)}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => passportQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <p className="font-bold text-ink">No entries recorded yet</p>
          <p className="text-xs text-mute">
            Entries will appear here automatically as versions are uploaded and transformations are logged.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Continuous Vertical Connector Line */}
          <div className="absolute left-[17px] sm:left-[21px] top-6 bottom-6 w-0.5 bg-line -z-10" />

          {entries.map((entry) => {
            const isChainBrokenHere =
              verifyResult?.first_broken_seq != null &&
              entry.seq === verifyResult.first_broken_seq;
            const isUntrusted =
              verifyResult?.first_broken_seq != null &&
              entry.seq > verifyResult.first_broken_seq;
            const hasFileMismatch = verifyResult?.file_mismatches?.some(
              (m) => m.version_no === entry.payload?.version_no
            );

            const isRecent = recentEntryIds.has(entry.id);

            // Icon by entry type
            const Icon =
              entry.entry_type === "CREATED"
                ? Sparkles
                : entry.entry_type === "VERSION_ADDED"
                ? FileText
                : Wand2;

            // Title by entry type
            const title =
              entry.entry_type === "CREATED"
                ? "Dataset created"
                : entry.entry_type === "VERSION_ADDED"
                ? `Version ${entry.payload.version_no} added`
                : `TRANSFORMATION: ${entry.payload.type} (v${entry.payload.from_version} → v${entry.payload.to_version})`;

            const diff = entry.payload.diff_vs_previous;

            return (
              <div
                key={entry.id}
                className={`relative card p-5 sm:p-6 transition-all duration-300 border ${
                  isChainBrokenHere
                    ? "border-2 border-bad bg-bad-soft/20 shadow-tip"
                    : isUntrusted
                    ? "opacity-50 saturate-50 border-dashed border-bad/40"
                    : "border-transparent hover:border-line hover:shadow-float"
                } ${isRecent ? "animate-flash" : ""}`}
              >
                {/* Node Anchor on the Left Rail */}
                <div
                  className={`absolute -left-[27px] sm:-left-[31px] top-5 size-7 rounded-full border-2 grid place-items-center bg-surface ${
                    isChainBrokenHere
                      ? "border-bad text-bad"
                      : isUntrusted
                      ? "border-bad/40 text-bad/40"
                      : "border-line text-ink"
                  }`}
                >
                  <Icon size={13} />
                </div>

                <div className="space-y-4">
                  {/* Entry Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-line/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="chip font-mono text-[11px] font-bold num bg-card">
                        #{entry.seq}
                      </span>
                      <h3 className="font-extrabold text-base text-ink truncate">
                        {title}
                      </h3>
                      {isChainBrokenHere && (
                        <span className="pill-bad text-[11px] font-bold">
                          Broken Link / Tampered
                        </span>
                      )}
                      {isUntrusted && (
                        <span className="pill-warn text-[11px] font-bold">
                          ⚠️ Cannot be trusted
                        </span>
                      )}
                      {hasFileMismatch && (
                        <span className="pill-bad text-[11px] font-bold">
                          File Modified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-mute">
                      <span
                        className="cursor-help"
                        title={new Date(entry.created_at).toLocaleString()}
                      >
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Entry Body by Type */}
                  {entry.entry_type === "CREATED" && (
                    <div className="space-y-1.5 text-xs text-subtle">
                      <p>
                        <span className="font-semibold text-ink">Name:</span>{" "}
                        {entry.payload.name}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">Primary key:</span>{" "}
                        {(entry.payload.primary_key ?? []).length > 0 ? (
                          <span className="font-mono text-ink">
                            [{(entry.payload.primary_key ?? []).join(", ")}]
                          </span>
                        ) : (
                          <span className="pill-warn text-[10px]">None (row-hash mode)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {entry.entry_type === "VERSION_ADDED" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                        <span className="font-semibold text-ink">
                          {entry.payload.row_count?.toLocaleString()} rows ×{" "}
                          {entry.payload.column_count} cols
                        </span>
                        <span>•</span>
                        <span>{entry.payload.file_name ?? "Unknown file"}</span>
                        <span>•</span>
                        <span>{formatBytes(entry.payload.file_size)}</span>
                        <span>•</span>
                        <HashChip hash={entry.payload.file_sha256 ?? ""} prefix="file" />
                      </div>

                      {/* Diff vs Previous Chips */}
                      {diff && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <StatChip type="added" count={diff.added} />
                          <StatChip type="deleted" count={diff.deleted} />
                          {diff.modified != null && (
                            <StatChip type="modified" count={diff.modified} />
                          )}
                          <StatChip type="unchanged" count={diff.unchanged} />

                          {diff.columns_added > 0 && (
                            <span className="chip text-ok text-[11px] font-semibold">
                              +{diff.columns_added} col added
                            </span>
                          )}
                          {diff.columns_removed > 0 && (
                            <span className="chip text-bad text-[11px] font-semibold">
                              -{diff.columns_removed} col removed
                            </span>
                          )}
                          {diff.columns_dtype_changed > 0 && (
                            <span className="chip text-warn text-[11px] font-semibold">
                              ~{diff.columns_dtype_changed} dtype changed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {entry.entry_type === "TRANSFORMATION" && (
                    <div className="space-y-2 text-xs">
                      {entry.payload.description && (
                        <p className="text-subtle font-medium italic">
                          &ldquo;{entry.payload.description}&rdquo;
                        </p>
                      )}

                      {entry.payload.params &&
                        Object.keys(entry.payload.params).length > 0 && (
                          <div className="bg-surface border border-line rounded-control p-2.5 font-mono text-[11px] space-y-1">
                            {Object.entries(entry.payload.params).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-mute">{k}:</span>
                                <span className="text-ink font-semibold">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Entry Footer: Actor & Hash Chain Linkage */}
                  <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ActorChip
                        label={entry.actor_label}
                        type={entry.actor_type}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap font-mono">
                      <HashChip hash={entry.prev_hash} prefix="prev" />
                      <ArrowRight size={12} className="text-mute shrink-0" />
                      <HashChip hash={entry.entry_hash} prefix="entry" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PassportPage() {
  return (
    <Suspense
      fallback={
        <div className="card p-8 text-center space-y-3">
          <div className="skeleton h-8 w-48 mx-auto" />
          <div className="skeleton h-24 w-full" />
        </div>
      }
    >
      <PassportTimeline />
    </Suspense>
  );
}

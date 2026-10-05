"use client";
import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Columns,
} from "lucide-react";
import { api, apiHeaders, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Diff, Version } from "@/app/api/types";

function CompareContent() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load available versions
  const versionsQuery = useQuery({
    queryKey: qk.versions(id),
    queryFn: async () =>
      unwrap<Version[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/versions", {
          params: { path: { dataset_id: id }, header: apiHeaders },
        })
      ),
  });

  const versions = versionsQuery.data ?? [];

  // Version selections from query params or defaults
  const paramFrom = searchParams.get("from");
  const paramTo = searchParams.get("to");

  const [activeTab, setActiveTab] = useState<"added" | "deleted" | "modified">("added");
  const [page, setPage] = useState(0);

  const fromVersion = paramFrom
    ? Number(paramFrom)
    : versions.length > 1
      ? versions[versions.length - 2].version_no
      : versions[0]?.version_no ?? null;
  const toVersion = paramTo
    ? Number(paramTo)
    : versions[versions.length - 1]?.version_no ?? null;

  // Update query params when versions change
  const updateVersionSelection = (newFrom: number, newTo: number) => {
    setPage(0);
    const p = new URLSearchParams(searchParams.toString());
    p.set("from", String(newFrom));
    p.set("to", String(newTo));
    router.replace(`/datasets/${id}/compare?${p.toString()}`);
  };

  const isSameVersion = fromVersion != null && toVersion != null && fromVersion === toVersion;

  // Query Diff
  const diffQuery = useQuery({
    queryKey: ["diff", id, fromVersion, toVersion, page],
    queryFn: async () => {
      if (fromVersion == null || toVersion == null || isSameVersion) return null;
      return unwrap<Diff>(
        await api.GET("/api/v1/datasets/{dataset_id}/diff", {
          params: {
            path: { dataset_id: id },
            header: apiHeaders,
            query: {
              from: fromVersion,
              to: toVersion,
              limit: 100,
              offset: page * 100,
            },
          },
        })
      );
    },
    enabled: fromVersion != null && toVersion != null && !isSameVersion,
  });

  const diff = diffQuery.data;

  // Active total count for pagination
  const activeCount = diff?.summary
    ? activeTab === "added"
      ? diff.summary.added
      : activeTab === "deleted"
      ? diff.summary.deleted
      : (diff.summary.modified ?? 0)
    : 0;

  const totalPages = Math.max(1, Math.ceil(activeCount / 100));

  return (
    <div className="space-y-6">
      {/* Version Pickers Header */}
      <div className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">From</span>
            <select
              className="input cursor-pointer font-bold text-sm w-auto min-w-[120px]"
              value={fromVersion ?? ""}
              onChange={(e) => {
                if (toVersion != null) {
                  updateVersionSelection(Number(e.target.value), toVersion);
                }
              }}
              disabled={versions.length === 0}
            >
              {versions.map((v) => (
                <option key={v.version_no} value={v.version_no}>
                  v{v.version_no} ({v.file_name})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight size={16} className="text-mute shrink-0 hidden sm:inline" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">To</span>
            <select
              className="input cursor-pointer font-bold text-sm w-auto min-w-[120px]"
              value={toVersion ?? ""}
              onChange={(e) => {
                if (fromVersion != null) {
                  updateVersionSelection(fromVersion, Number(e.target.value));
                }
              }}
              disabled={versions.length === 0}
            >
              {versions.map((v) => (
                <option key={v.version_no} value={v.version_no}>
                  v{v.version_no} ({v.file_name})
                </option>
              ))}
            </select>
          </div>

          {diff?.mode && (
            <span className="chip font-mono text-[11px] text-mute ml-2">
              mode: {diff.mode}
            </span>
          )}
        </div>

        {versions.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-mute">
            <span>{versions.length} versions available</span>
          </div>
        )}
      </div>

      {/* Same Version Alert */}
      {isSameVersion && (
        <div className="card p-10 text-center space-y-2">
          <p className="font-bold text-ink text-base">Pick two different versions</p>
          <p className="text-xs text-mute">
            Select different &ldquo;From&rdquo; and &ldquo;To&rdquo; versions above to compare schema and row diffs.
          </p>
        </div>
      )}

      {/* Loading state */}
      {diffQuery.isLoading && !isSameVersion && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-8 w-24" />
              </div>
            ))}
          </div>
          <div className="card p-8 space-y-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-20 w-full" />
          </div>
        </div>
      )}

      {/* Error state */}
      {diffQuery.isError && (
        <div className="card p-8 text-center space-y-3">
          <p className="text-bad font-semibold text-sm">
            {errMsg(diffQuery.error)}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => diffQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Diff Content */}
      {diff && !isSameVersion && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Rows Delta Card */}
            <div className="card p-4 space-y-1">
              <span className="text-xs font-semibold text-mute">Total Rows</span>
              <div className="text-xl font-extrabold text-ink num">
                {diff.summary.rows_a.toLocaleString()} → {diff.summary.rows_b.toLocaleString()}
              </div>
              <p className="text-[11px] text-mute num">
                Delta:{" "}
                <span className={diff.summary.row_delta >= 0 ? "text-ok font-bold" : "text-bad font-bold"}>
                  {diff.summary.row_delta >= 0 ? `+${diff.summary.row_delta}` : diff.summary.row_delta}
                </span>
              </p>
            </div>

            {/* Added Card */}
            <div className="card p-4 space-y-1 bg-ok-soft/30 border border-ok/10">
              <span className="text-xs font-semibold text-ok">Added Rows</span>
              <div className="text-2xl font-extrabold text-ok num">
                +{diff.summary.added.toLocaleString()}
              </div>
              <p className="text-[11px] text-mute num">New primary keys</p>
            </div>

            {/* Deleted Card */}
            <div className="card p-4 space-y-1 bg-bad-soft/30 border border-bad/10">
              <span className="text-xs font-semibold text-bad">Deleted Rows</span>
              <div className="text-2xl font-extrabold text-bad num">
                -{diff.summary.deleted.toLocaleString()}
              </div>
              <p className="text-[11px] text-mute num">Removed primary keys</p>
            </div>

            {/* Modified Card (only if modified is not null) */}
            {diff.summary.modified != null ? (
              <div className="card p-4 space-y-1 bg-warn-soft/30 border border-warn/10">
                <span className="text-xs font-semibold text-warn">Modified Rows</span>
                <div className="text-2xl font-extrabold text-warn num">
                  ~{diff.summary.modified.toLocaleString()}
                </div>
                <p className="text-[11px] text-mute num">Existing rows changed</p>
              </div>
            ) : (
              <div className="card p-4 space-y-1 bg-card">
                <span className="text-xs font-semibold text-mute">Modified</span>
                <div className="text-xl font-bold text-mute italic">–</div>
                <p className="text-[10px] text-mute">Row-hash mode (no PK)</p>
              </div>
            )}
          </div>

          {/* Warnings Banner */}
          {diff.warnings && diff.warnings.length > 0 && (
            <div className="p-4 rounded-card bg-warn-soft border border-warn/20 space-y-1.5 text-xs text-warn">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={15} />
                <span>Diff engine notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1 font-medium">
                {diff.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schema Diff Panel */}
          <div className="card p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <Columns size={16} className="text-mute" />
                <h3 className="font-extrabold text-ink text-sm sm:text-base">Schema Diff</h3>
              </div>
              <span className="text-xs text-mute font-mono">
                +{diff.summary.columns_added} / -{diff.summary.columns_removed} columns
              </span>
            </div>

            {diff.schema_diff.columns_added.length === 0 &&
            diff.schema_diff.columns_removed.length === 0 &&
            diff.schema_diff.dtype_changed.length === 0 &&
            diff.schema_diff.possible_renames.length === 0 ? (
              <p className="text-xs text-mute py-1">No schema changes between these versions.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {diff.schema_diff.columns_added.map((col) => (
                  <span key={col} className="pill-ok font-mono text-[11px]">
                    +{col} (added)
                  </span>
                ))}

                {diff.schema_diff.columns_removed.map((col) => (
                  <span key={col} className="pill-bad font-mono text-[11px]">
                    -{col} (removed)
                  </span>
                ))}

                {diff.schema_diff.dtype_changed.map((d) => (
                  <span key={d.column} className="pill-warn font-mono text-[11px]">
                    {d.column}: {d.from} → {d.to}
                  </span>
                ))}

                {diff.schema_diff.possible_renames.map((r) => (
                  <span
                    key={`${r.from}-${r.to}`}
                    className="chip bg-surface font-mono text-[11px] text-ink border-line"
                  >
                    {r.from} → {r.to} <span className="text-mute text-[10px] ml-1">(possible rename)</span>
                  </span>
                ))}
              </div>
            )}

            {/* Column Change Counts */}
            {diff.column_changes && Object.keys(diff.column_changes).length > 0 && (
              <div className="pt-3 border-t border-line/60">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mute mb-2">
                  Changes by column
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(diff.column_changes).map(([col, cnt]) => (
                    <span key={col} className="chip bg-surface font-mono text-[11px]">
                      <span className="font-semibold text-ink">{col}:</span>
                      <span className="text-subtle ml-1 num">{cnt}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row Diff Section */}
          <div className="space-y-3">
            {/* Sub-tabs: Added / Deleted / Modified */}
            <div className="flex items-center justify-between gap-4">
              <nav className="flex items-center gap-5">
                <button
                  type="button"
                  className="tab"
                  data-active={activeTab === "added"}
                  onClick={() => {
                    setActiveTab("added");
                    setPage(0);
                  }}
                >
                  Added rows ({diff.summary.added.toLocaleString()})
                </button>
                <button
                  type="button"
                  className="tab"
                  data-active={activeTab === "deleted"}
                  onClick={() => {
                    setActiveTab("deleted");
                    setPage(0);
                  }}
                >
                  Deleted rows ({diff.summary.deleted.toLocaleString()})
                </button>
                {diff.summary.modified != null && (
                  <button
                    type="button"
                    className="tab"
                    data-active={activeTab === "modified"}
                    onClick={() => {
                      setActiveTab("modified");
                      setPage(0);
                    }}
                  >
                    Modified rows ({diff.summary.modified.toLocaleString()})
                  </button>
                )}
              </nav>

              {/* Pagination controls */}
              {activeCount > 100 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-mute num">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="size-7 rounded-control grid place-items-center bg-surface border border-line disabled:opacity-30"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="size-7 rounded-control grid place-items-center bg-surface border border-line disabled:opacity-30"
                      disabled={(page + 1) * 100 >= activeCount}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: Added Rows Table */}
            {activeTab === "added" && (
              <div className="border border-line rounded-card overflow-hidden">
                {diff.rows.added.length === 0 ? (
                  <div className="card p-8 text-center text-xs text-mute">
                    No added rows between these versions.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-card border-b border-line sticky top-0 z-10 font-mono">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold text-ink">#</th>
                          {Object.keys(diff.rows.added[0] || {}).map((col) => (
                            <th key={col} className="px-3.5 py-2.5 font-bold text-ink">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {diff.rows.added.map((row, rIdx) => (
                          <tr key={rIdx} className="diff-added transition-colors font-mono">
                            <td className="px-3.5 py-2 text-mute num">
                              {page * 100 + rIdx + 1}
                            </td>
                            {Object.keys(diff.rows.added[0] || {}).map((col) => {
                              const val = row[col];
                              return (
                                <td
                                  key={col}
                                  className={`px-3.5 py-2 max-w-[200px] truncate ${
                                    val === null ? "null-cell" : "text-ink"
                                  }`}
                                >
                                  {val === null ? "∅" : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Deleted Rows Table */}
            {activeTab === "deleted" && (
              <div className="border border-line rounded-card overflow-hidden">
                {diff.rows.deleted.length === 0 ? (
                  <div className="card p-8 text-center text-xs text-mute">
                    No deleted rows between these versions.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-card border-b border-line sticky top-0 z-10 font-mono">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold text-ink">#</th>
                          {Object.keys(diff.rows.deleted[0] || {}).map((col) => (
                            <th key={col} className="px-3.5 py-2.5 font-bold text-ink">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {diff.rows.deleted.map((row, rIdx) => (
                          <tr key={rIdx} className="diff-deleted transition-colors font-mono">
                            <td className="px-3.5 py-2 text-mute num">
                              {page * 100 + rIdx + 1}
                            </td>
                            {Object.keys(diff.rows.deleted[0] || {}).map((col) => {
                              const val = row[col];
                              return (
                                <td
                                  key={col}
                                  className={`px-3.5 py-2 max-w-[200px] truncate ${
                                    val === null ? "null-cell" : "text-ink"
                                  }`}
                                >
                                  {val === null ? "∅" : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Modified Rows */}
            {activeTab === "modified" && diff.summary.modified != null && (
              <div className="space-y-2">
                {diff.rows.modified.length === 0 ? (
                  <div className="card p-8 text-center text-xs text-mute">
                    No modified rows between these versions.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                    {diff.rows.modified.map((item, mIdx) => (
                      <div
                        key={mIdx}
                        className="diff-modified p-3.5 rounded-control flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Key identification */}
                        <div className="flex items-center gap-2">
                          <span className="chip font-mono font-bold bg-surface text-ink text-[11px]">
                            {Object.entries(item.key)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(", ")}
                          </span>
                        </div>

                        {/* Changed columns old -> new */}
                        <div className="flex flex-wrap items-center gap-3">
                          {item.changes.map((ch, cIdx) => (
                            <div
                              key={cIdx}
                              className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-control px-2.5 py-1 font-mono text-[11px]"
                            >
                              <span className="text-mute font-semibold">{ch.column}:</span>
                              <span className="line-through text-bad">
                                {ch.old === null ? "∅" : String(ch.old)}
                              </span>
                              <ArrowRight size={11} className="text-mute" />
                              <span className="text-ok font-bold">
                                {ch.new === null ? "∅" : String(ch.new)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="card p-8 text-center space-y-3">
          <div className="skeleton h-8 w-48 mx-auto" />
          <div className="skeleton h-32 w-full" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}

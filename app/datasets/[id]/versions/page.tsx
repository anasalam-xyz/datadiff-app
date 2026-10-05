"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, GitCompare, Wand2 } from "lucide-react";
import { api, apiHeaders, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Transformation, Version } from "@/app/api/types";
import { useIntegrity } from "@/components/IntegrityBadge";
import HashChip from "@/components/HashChip";
import ActorChip from "@/components/ActorChip";
import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import FileDropzone from "@/components/FileDropzone";
import LogTransformationModal from "@/components/LogTransformationModal";

function formatBytes(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PreviewData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function VersionsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { setState: setIntegrity } = useIntegrity();

  const [activeVersionForDrawer, setActiveVersionForDrawer] = useState<Version | null>(null);
  const [drawerTab, setDrawerTab] = useState<"preview" | "schema">("preview");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedTransformation, setSelectedTransformation] = useState<Transformation | null>(null);

  // Fetch Versions
  const versionsQuery = useQuery({
    queryKey: qk.versions(id),
    queryFn: async () =>
      unwrap<Version[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/versions", {
          params: { path: { dataset_id: id }, header: apiHeaders() },
        })
      ),
  });

  // Fetch Transformations
  const transformationsQuery = useQuery({
    queryKey: qk.transformations(id),
    queryFn: async () =>
      unwrap<Transformation[]>(
        await api.GET("/api/v1/datasets/{dataset_id}/transformations", {
          params: { path: { dataset_id: id }, header: apiHeaders() },
        })
      ),
  });

  // Fetch Version Preview when drawer is open
  const previewQuery = useQuery({
    queryKey: ["preview", id, activeVersionForDrawer?.version_no],
    queryFn: async () => {
      if (!activeVersionForDrawer) return null;
      return unwrap<PreviewData>(
        await api.GET("/api/v1/datasets/{dataset_id}/versions/{version_no}/preview", {
          params: {
            path: {
              dataset_id: id,
              version_no: activeVersionForDrawer.version_no,
            },
            header: apiHeaders(),
            query: { limit: 50 },
          },
        })
      );
    },
    enabled: !!activeVersionForDrawer,
  });

  const versions = versionsQuery.data ?? [];
  const transformations = transformationsQuery.data ?? [];

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: qk.versions(id) });
    queryClient.invalidateQueries({ queryKey: qk.passport(id) });
    setIntegrity("unknown");
  };

  // Helper to find transformations between consecutive versions
  const getTransformationsForPair = (fromV: number, toV: number) => {
    return transformations.filter(
      (t) => t.from_version === fromV && t.to_version === toV
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <FileDropzone datasetId={id} onUploaded={handleUploadSuccess} />

      {/* Header & Log Transformation Button */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-ink">Version history</h2>
          <span className="chip num font-bold text-xs">{versions.length} versions</span>
        </div>

        <button
          type="button"
          className="btn btn-solid btn-sm"
          onClick={() => setLogModalOpen(true)}
          disabled={versions.length < 2}
          title={
            versions.length < 2
              ? "At least two versions required to log a transformation"
              : ""
          }
        >
          <Wand2 size={14} />
          <span>Log transformation</span>
        </button>
      </div>

      {/* Versions List & Table */}
      {versionsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-2">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-4 w-72" />
            </div>
          ))}
        </div>
      ) : versionsQuery.isError ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-bad font-semibold text-sm">
            {errMsg(versionsQuery.error)}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => versionsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : versions.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <p className="font-bold text-ink text-base">No versions uploaded yet</p>
          <p className="text-xs text-mute max-w-sm mx-auto">
            Drag and drop a CSV, JSON, or JSONL file into the dropzone above to create version 1.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((v, index) => {
            // Transformations leading to this version from previous version
            const prevVersion = index > 0 ? versions[index - 1] : null;
            const pairTransforms = prevVersion
              ? getTransformationsForPair(prevVersion.version_no, v.version_no)
              : [];

            return (
              <div key={v.id} className="space-y-3">
                {/* Transformation Stepper Indicator between versions */}
                {prevVersion && (
                  <div className="pl-6 sm:pl-8 py-1 flex items-center gap-3">
                    <div className="h-4 w-0.5 bg-line" />
                    {pairTransforms.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {pairTransforms.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTransformation(t)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-surface border border-line hover:border-ink transition-colors group cursor-pointer shadow-xs"
                          >
                            <Wand2 size={11} className="text-mute group-hover:text-ink" />
                            <span className="font-mono text-ink">{t.type}</span>
                            <span className="text-[10px] text-mute font-mono">
                              (v{t.from_version} → v{t.to_version})
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-mute flex items-center gap-1 font-mono">
                        <span>v{prevVersion.version_no} → v{v.version_no}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Version Card Row */}
                <div
                  onClick={() => {
                    setActiveVersionForDrawer(v);
                    setDrawerTab("preview");
                  }}
                  className="card-row p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer border border-transparent hover:border-line group"
                >
                  {/* Left: Version badge + File info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="size-11 rounded-control bg-surface border border-line grid place-items-center font-bold text-ink shrink-0 group-hover:bg-ink group-hover:text-white transition-colors">
                      <span className="num text-sm">v{v.version_no}</span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-base truncate group-hover:underline">
                          {v.file_name}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                        <span className="num font-medium text-ink">
                          {v.row_count.toLocaleString()} rows × {v.column_count} cols
                        </span>
                        <span>•</span>
                        <span>{formatBytes(v.file_size)}</span>
                        <span>•</span>
                        <HashChip hash={v.file_sha256} prefix="sha256" />
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Actor, Date, Compare & Preview */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line/60">
                    <div className="flex items-center gap-2">
                      <ActorChip label={v.created_by} />
                      <span
                        className="text-xs text-mute hidden sm:inline"
                        title={new Date(v.created_at).toLocaleString()}
                      >
                        {new Date(v.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {v.version_no > 1 && (
                        <Link
                          href={`/datasets/${id}/compare?from=${v.version_no - 1}&to=${v.version_no}`}
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-ghost btn-sm text-xs"
                          title="Compare with previous version"
                        >
                          <GitCompare size={12} />
                          <span className="hidden sm:inline">Compare</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        className="btn btn-solid btn-sm text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVersionForDrawer(v);
                          setDrawerTab("preview");
                        }}
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Version Preview & Schema Drawer */}
      <Drawer
        isOpen={!!activeVersionForDrawer}
        onClose={() => setActiveVersionForDrawer(null)}
        title={
          activeVersionForDrawer
            ? `Version ${activeVersionForDrawer.version_no}: ${activeVersionForDrawer.file_name}`
            : "Version preview"
        }
        subtitle={
          activeVersionForDrawer
            ? `${activeVersionForDrawer.row_count.toLocaleString()} rows • ${activeVersionForDrawer.column_count} columns • ${formatBytes(activeVersionForDrawer.file_size)}`
            : undefined
        }
        width="max-w-3xl"
      >
        {activeVersionForDrawer && (
          <div className="space-y-5">
            {/* Drawer Tabs */}
            <div className="flex items-center gap-6 border-b border-line pb-2">
              <button
                type="button"
                className="tab"
                data-active={drawerTab === "preview"}
                onClick={() => setDrawerTab("preview")}
              >
                Data preview (first 50 rows)
              </button>
              <button
                type="button"
                className="tab"
                data-active={drawerTab === "schema"}
                onClick={() => setDrawerTab("schema")}
              >
                Schema ({activeVersionForDrawer.column_count} columns)
              </button>
            </div>

            {/* TAB 1: Preview Table */}
            {drawerTab === "preview" && (
              <div>
                {previewQuery.isLoading ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="skeleton h-8 w-48 mx-auto" />
                    <div className="skeleton h-40 w-full" />
                  </div>
                ) : previewQuery.isError ? (
                  <p className="text-bad text-sm p-4 text-center">
                    {errMsg(previewQuery.error)}
                  </p>
                ) : previewQuery.data ? (
                  <div className="border border-line rounded-card overflow-hidden">
                    <div className="overflow-x-auto max-h-[60vh]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-card sticky top-0 border-b border-line z-10">
                          <tr>
                            <th className="px-3.5 py-2.5 font-bold text-ink">#</th>
                            {previewQuery.data!.columns.map((col) => (
                              <th
                                key={col}
                                className="px-3.5 py-2.5 font-bold text-ink font-mono"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60 bg-surface">
                          {previewQuery.data!.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-card/40 transition-colors">
                              <td className="px-3.5 py-2 text-mute font-mono num">
                                {rIdx + 1}
                              </td>
                              {previewQuery.data!.columns.map((col) => {
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
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 2: Schema Table */}
            {drawerTab === "schema" && (
              <div className="border border-line rounded-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-card border-b border-line">
                    <tr>
                      <th className="px-4 py-3 font-bold text-ink">Column Name</th>
                      <th className="px-4 py-3 font-bold text-ink">Data Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface font-mono">
                    {activeVersionForDrawer.columns_schema.map((c, idx) => (
                      <tr key={idx} className="hover:bg-card/30">
                        <td className="px-4 py-2.5 font-bold text-ink">{c.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="chip text-[11px] bg-card">{c.dtype}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Transformation Details Popover Modal */}
      {selectedTransformation && (
        <Modal
          isOpen={!!selectedTransformation}
          onClose={() => setSelectedTransformation(null)}
          title={`Transformation: ${selectedTransformation.type}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="chip font-mono font-bold bg-card text-ink">
                v{selectedTransformation.from_version} → v{selectedTransformation.to_version}
              </span>
              <ActorChip label={selectedTransformation.actor_label} />
              <span className="text-mute">
                {new Date(selectedTransformation.created_at).toLocaleString()}
              </span>
            </div>

            {selectedTransformation.description && (
              <div>
                <p className="text-mute font-semibold uppercase tracking-wider text-[11px] mb-1">
                  Description
                </p>
                <p className="p-3 bg-card rounded-control text-ink font-medium">
                  {selectedTransformation.description}
                </p>
              </div>
            )}

            <div>
              <p className="text-mute font-semibold uppercase tracking-wider text-[11px] mb-1">
                Parameters
              </p>
              <pre className="p-3 bg-card rounded-control font-mono text-[11px] overflow-x-auto text-ink">
                {JSON.stringify(selectedTransformation.params, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn btn-solid btn-sm"
                onClick={() => setSelectedTransformation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Transformation Modal */}
      <LogTransformationModal
        datasetId={id}
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        versions={versions}
      />
    </div>
  );
}

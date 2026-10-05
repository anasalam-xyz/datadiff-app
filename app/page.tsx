"use client";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BookOpen, Database, Layers, Plus, Search, ShieldCheck } from "lucide-react";
import { api, apiHeaders, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset, Version } from "@/app/api/types";
import DatasetRow from "@/components/DatasetRow";
import NewDatasetModal from "@/components/NewDatasetModal";
import EmptyState from "@/components/EmptyState";
import { EmptyBook, PassportHero } from "@/components/Illustrations";

type FilterTab = "all" | "pk" | "nopk";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const datasetsQuery = useQuery({
    queryKey: qk.datasets,
    queryFn: async () => unwrap<Dataset[]>(await api.GET("/api/v1/datasets", { params: { header: apiHeaders } })),
  });

  const datasets = datasetsQuery.data ?? [];

  // Compute total versions across all datasets dynamically
  const versionQueries = useQueries({
    queries: datasets.map((d) => ({
      queryKey: qk.versions(d.id),
      queryFn: async () =>
        unwrap<Version[]>(
          await api.GET("/api/v1/datasets/{dataset_id}/versions", {
            params: { path: { dataset_id: d.id }, header: apiHeaders },
          })
        ),
    })),
  });

  const totalVersions = versionQueries.reduce(
    (sum, q) => sum + (q.data?.length ?? 0),
    0
  );
  const versionsLoading = versionQueries.some((q) => q.isLoading);

  // Filter datasets by search query and active tab
  const filteredDatasets = datasets.filter((d) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Tab filter
    if (activeTab === "pk") return d.primary_key.length > 0;
    if (activeTab === "nopk") return d.primary_key.length === 0;
    return true;
  });

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      {/* ================= LEFT MAIN COLUMN ================= */}
      <div className="space-y-6 min-w-0">
        {/* Hero Greeting Card */}
        <div className="card p-6 sm:p-7 flex items-center justify-between overflow-hidden relative">
          <div className="space-y-1.5 max-w-md z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Dataset passports
            </h1>
            <p className="text-sm text-subtle">
              Every change to an AI dataset, hash-chained and verifiable.
            </p>
          </div>
          <div className="shrink-0 -my-3 opacity-95">
            <PassportHero className="h-24 sm:h-28 w-auto" />
          </div>
        </div>

        {/* Section Header with Filter Tabs and New Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-extrabold text-ink">Datasets</h2>
            <nav className="flex items-center gap-4">
              <button
                type="button"
                className="tab"
                data-active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              >
                All datasets
              </button>
              <button
                type="button"
                className="tab"
                data-active={activeTab === "pk"}
                onClick={() => setActiveTab("pk")}
              >
                With primary key
              </button>
              <button
                type="button"
                className="tab"
                data-active={activeTab === "nopk"}
                onClick={() => setActiveTab("nopk")}
              >
                Row-hash only
              </button>
            </nav>
          </div>

          <button
            type="button"
            className="btn btn-solid btn-sm shrink-0 self-start sm:self-auto"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={15} />
            <span>New dataset</span>
          </button>
        </div>

        {/* Dataset Rows List */}
        {datasetsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-row p-4 flex items-center gap-4">
                <div className="skeleton size-11 rounded-control shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-64" />
                </div>
                <div className="skeleton h-8 w-24 rounded-control" />
              </div>
            ))}
          </div>
        ) : datasetsQuery.isError ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-bad font-semibold text-sm">
              {errMsg(datasetsQuery.error)}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => datasetsQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : datasets.length === 0 ? (
          <EmptyState
            title="No datasets yet"
            description="Create one or upload your first dataset to start logging versions and hash-chained passports."
            action={
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => setModalOpen(true)}
              >
                <Plus size={16} />
                New dataset
              </button>
            }
          />
        ) : filteredDatasets.length === 0 ? (
          <div className="card p-10 text-center space-y-2">
            <p className="font-bold text-ink">No datasets found</p>
            <p className="text-xs text-mute">
              {searchQuery
                ? `No datasets match "${searchQuery}".`
                : "No datasets in this category."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDatasets.map((d) => (
              <DatasetRow key={d.id} dataset={d} />
            ))}
          </div>
        )}
      </div>

      {/* ================= RIGHT SIDEBAR COLUMN ================= */}
      <div className="space-y-5 shrink-0">
        {/* Search Input (matching top-right search in inspo) */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="text"
            className="input pl-9 text-xs sm:text-sm"
            placeholder="Search datasets, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Statistics (stat-xl numerals like inspo's 11 and 4) */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="card p-5 flex items-center justify-between">
            <div>
              <div className="stat-xl">{datasets.length}</div>
              <div className="text-xs text-mute font-medium mt-1">Datasets tracked</div>
            </div>
            <div className="size-10 rounded-control bg-surface border border-line grid place-items-center text-ink shrink-0">
              <Database size={18} />
            </div>
          </div>

          <div className="card p-5 flex items-center justify-between">
            <div>
              <div className="stat-xl">
                {versionsLoading ? (
                  <span className="skeleton inline-block h-8 w-10" />
                ) : (
                  totalVersions
                )}
              </div>
              <div className="text-xs text-mute font-medium mt-1">Versions logged</div>
            </div>
            <div className="size-10 rounded-control bg-surface border border-line grid place-items-center text-ink shrink-0">
              <Layers size={18} />
            </div>
          </div>
        </div>

        {/* Integrity Callout Card (matching inspo's bottom promo card) */}
        <div className="card p-5.5 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-ok-soft text-ok">
            <ShieldCheck size={13} />
            <span>Tamper-evident</span>
          </div>

          <h3 className="font-extrabold text-ink text-base">
            Tamper-evident, not tamper-proof.
          </h3>

          <p className="text-xs text-subtle leading-relaxed">
            Every version and transformation is chained with SHA-256. Edit any row or stored file, and Verify will flag the exact mismatch.
          </p>

          <div className="pt-2 flex items-center justify-between">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm text-xs font-semibold"
            >
              <BookOpen size={13} />
              API Docs
            </a>
            <EmptyBook className="w-20 -mb-2 opacity-80" />
          </div>
        </div>
      </div>

      {/* New Dataset Modal */}
      <NewDatasetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
